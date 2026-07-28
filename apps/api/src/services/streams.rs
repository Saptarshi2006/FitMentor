use redis::aio::ConnectionManager;

const COACH_LOGS_STREAM: &str = "stream:coach:logs";
const COACH_GROUP: &str = "coach-consumers";
const COACH_CONSUMER: &str = "api-1";

pub async fn ensure_coach_group(conn: &mut ConnectionManager) {
    let _: Option<()> = redis::cmd("XGROUP CREATE")
        .arg(COACH_LOGS_STREAM)
        .arg(COACH_GROUP)
        .arg("$")
        .arg("MKSTREAM")
        .query_async(conn)
        .await
        .ok();
}

pub async fn publish_coach_log(conn: &mut ConnectionManager, event: &serde_json::Value) {
    let payload = serde_json::to_string(event).unwrap_or_default();
    let _: Option<String> = redis::cmd("XADD")
        .arg(COACH_LOGS_STREAM)
        .arg("*")
        .arg("payload")
        .arg(&payload)
        .query_async(conn)
        .await
        .ok();
}

#[derive(serde::Deserialize)]
pub struct CoachLogEvent {
    pub user_id: String,
    pub container_tag: String,
    pub user_message: String,
    pub reply: String,
    pub tier: String,
    pub messages: serde_json::Value,
    pub session_id: Option<String>,
}

pub async fn consume_coach_logs(
    pool: &sqlx::PgPool,
    conn: &mut ConnectionManager,
    ingest_url: String,
) {
    loop {
        let result: Option<Vec<Vec<String>>> = redis::cmd("XREADGROUP")
            .arg("GROUP")
            .arg(COACH_GROUP)
            .arg(COACH_CONSUMER)
            .arg("BLOCK")
            .arg(5000u64)
            .arg("COUNT")
            .arg(10u64)
            .arg("STREAMS")
            .arg(COACH_LOGS_STREAM)
            .arg(">")
            .query_async(conn)
            .await
            .ok()
            .flatten();
        if let Some(streams) = result {
            for stream_data in streams.chunks(2) {
                let entries_str = &stream_data.get(1).cloned().unwrap_or_default();
                for entry in entries_str.chunks(3) {
                    if let Some(payload) = entry.get(1) {
                        if let Ok(event) =
                            serde_json::from_str::<CoachLogEvent>(payload)
                        {
                            process_coach_log(
                                pool,
                                &event,
                                &ingest_url,
                            )
                            .await;
                            if let Some(id) = entry.first() {
                                let _: Option<()> = redis::cmd("XACK")
                                    .arg(COACH_LOGS_STREAM)
                                    .arg(COACH_GROUP)
                                    .arg(id)
                                    .query_async(conn)
                                    .await
                                    .ok();
                            }
                        }
                    }
                }
            }
        }
    }
}

async fn process_coach_log(
    pool: &sqlx::PgPool,
    event: &CoachLogEvent,
    ingest_url: &str,
) {
    let messages = &event.messages;
    let _ = sqlx::query(
        "INSERT INTO coach_logs (user_id, container_tag, messages)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, container_tag)
         DO UPDATE SET messages = $3",
    )
    .bind(&event.user_id)
    .bind(&event.container_tag)
    .bind(messages)
    .execute(pool)
    .await;

    if let Some(sid) = &event.session_id {
        if !sid.is_empty() {
            let mut msgs = messages
                .as_array()
                .cloned()
                .unwrap_or_default();
            msgs.push(serde_json::json!({
                "role": "assistant",
                "content": event.reply,
            }));
            let _ = sqlx::query(
                "UPDATE chat_sessions SET messages = $1, updated_at = NOW() WHERE id = CAST($2 AS uuid) AND user_id = $3",
            )
            .bind(serde_json::Value::Array(msgs))
            .bind(sid)
            .bind(&event.user_id)
            .execute(pool)
            .await;
        }
    }

    let iu = ingest_url.to_string();
    let content = format!("User: {}\nCoach: {}", event.user_message, event.reply);
    let ct = event.container_tag.clone();
    let t = event.tier.clone();
    tokio::spawn(async move {
        let _ = reqwest::Client::new()
            .post(format!("{}/v1/ingest", iu))
            .json(&serde_json::json!({
                "container_tag": ct,
                "content": content,
                "tier": t,
            }))
            .send()
            .await;
    });
}
