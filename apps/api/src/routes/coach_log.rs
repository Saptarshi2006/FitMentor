use axum::extract::State;
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::auth::middleware::AuthUser;
use crate::AppState;

#[derive(Deserialize)]
pub struct LogRequest {
    pub user_message: String,
    pub reply: String,
    pub container_tag: String,
}

#[derive(Serialize)]
pub struct LogResponse {
    pub ok: bool,
}

const INGEST_URL: &str = "http://ingest:8001/v1/ingest";

/// POST /v1/coach/log — save metadata to Postgres, forward content to Python ingest.
pub async fn log(
    State(state): State<AppState>,
    AuthUser { user_id, .. }: AuthUser,
    Json(req): Json<LogRequest>,
) -> Result<Json<LogResponse>, crate::error::AppError> {
    sqlx::query("INSERT INTO coach_logs (user_id, container_tag) VALUES ($1, $2)")
        .bind(&user_id)
        .bind(&req.container_tag)
        .execute(&state.pool)
        .await?;

    let content = format!("user: {}\nassistant: {}", req.user_message, req.reply);
    let ct = req.container_tag.clone();

    tokio::spawn(async move {
        let client = reqwest::Client::new();
        let _ = client
            .post(INGEST_URL)
            .json(&serde_json::json!({
                "container_tag": ct,
                "content": content,
            }))
            .send()
            .await;
    });

    Ok(Json(LogResponse { ok: true }))
}
