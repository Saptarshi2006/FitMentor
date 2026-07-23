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

/// POST /v1/coach/log — save a coach exchange to Postgres + Supermemory.
pub async fn log(
    State(state): State<AppState>,
    AuthUser { user_id, .. }: AuthUser,
    Json(req): Json<LogRequest>,
) -> Result<Json<LogResponse>, crate::error::AppError> {
    let messages = serde_json::json!([
        { "role": "user", "content": req.user_message },
        { "role": "assistant", "content": req.reply },
    ]);

    sqlx::query(
        "INSERT INTO coach_logs (user_id, container_tag, messages) VALUES ($1, $2, $3)",
    )
    .bind(&user_id)
    .bind(&req.container_tag)
    .bind(&messages)
    .execute(&state.pool)
    .await?;

    if state.supermemory.is_enabled() {
        let content = format!("user: {}\nassistant: {}", req.user_message, req.reply);
        let _ = state
            .supermemory
            .ingest(&req.container_tag, &content)
            .await;
    }

    Ok(Json(LogResponse { ok: true }))
}
