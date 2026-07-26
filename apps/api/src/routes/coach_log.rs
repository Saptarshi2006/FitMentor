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

    let event = serde_json::json!({
        "user_id": &user_id,
        "container_tag": &req.container_tag,
        "tier": &tier,
        "user_message": &req.user_message,
        "reply": &req.reply,
        "messages": &req.messages,
    });

    // Publish to Redis Streams for other services to consume
    if let Some(mut conn) = state.cache.get_conn() {
        crate::services::streams::publish_coach_log(&mut conn, &event).await;
    }

    let ingest_url = std::env::var("INGEST_URL").unwrap_or_else(|_| "http://ingest:8001".into());
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
