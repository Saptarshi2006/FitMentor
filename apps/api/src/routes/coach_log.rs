use axum::{extract::State, Json};
use serde::Deserialize;

use crate::auth::middleware::AuthUser;
use crate::error::AppError;
use crate::AppState;

#[derive(Deserialize)]
pub struct CoachLogRequest {
    pub user_message: String,
    pub reply: String,
    pub container_tag: String,
    pub messages: Option<serde_json::Value>,
    pub session_id: Option<String>,
}

/// POST /v1/coach/log — store container_tag + messages in Postgres, forward conversation to Python ingest.
pub async fn log(
    State(state): State<AppState>,
    AuthUser { user_id, .. }: AuthUser,
    Json(req): Json<CoachLogRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Look up user's subscription tier
    let tier: String = sqlx::query_scalar(
        "SELECT tier FROM subscriptions WHERE user_id = $1 AND status = 'active' LIMIT 1",
    )
    .bind(&user_id)
    .fetch_optional(&state.pool)
    .await?
    .unwrap_or_else(|| "free".to_string());

    let messages = req.messages.clone().unwrap_or(serde_json::json!([]));
    sqlx::query(
        "INSERT INTO coach_logs (user_id, container_tag, messages)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, container_tag)
         DO UPDATE SET messages = $3",
    )
    .bind(&user_id)
    .bind(&req.container_tag)
    .bind(&messages)
    .execute(&state.pool)
    .await?;

    // Update chat_sessions with the reply
    if let Some(sid) = &req.session_id {
        if !sid.is_empty() {
            let mut msgs = messages.as_array().cloned().unwrap_or_default();
            msgs.push(serde_json::json!({
                "role": "assistant",
                "content": &req.reply,
            }));
            if let Err(e) = sqlx::query(
                "UPDATE chat_sessions SET messages = $1, updated_at = NOW() WHERE id = CAST($2 AS uuid) AND user_id = $3",
            )
            .bind(serde_json::Value::Array(msgs))
            .bind(sid)
            .bind(&user_id)
            .execute(&state.pool)
            .await
            {
                tracing::warn!("coach log: failed to update chat session {sid}: {e}");
            }
        }
    }

    let event = serde_json::json!({
        "user_id": &user_id,
        "container_tag": &req.container_tag,
        "tier": &tier,
        "user_message": &req.user_message,
        "reply": &req.reply,
        "messages": &req.messages,
        "session_id": &req.session_id,
    });

    // Publish to Redis Streams for other services to consume
    if let Some(mut conn) = state.cache.get_conn() {
        crate::services::streams::publish_coach_log(&mut conn, &event).await;
    }

    let ingest_url = std::env::var("INGEST_URL").unwrap_or_else(|_| "http://ws:8080".into());
    let content = format!("User: {}\nCoach: {}", req.user_message, req.reply);
    let container_tag = req.container_tag.clone();
    let tier2 = tier.clone();
    tokio::spawn(async move {
        let _ = reqwest::Client::new()
            .post(format!("{}/v1/ingest", ingest_url))
            .json(&serde_json::json!({
                "container_tag": container_tag,
                "content": content,
                "tier": tier2,
            }))
            .send()
            .await;
    });

    Ok(Json(serde_json::json!({"ok": true})))
}
