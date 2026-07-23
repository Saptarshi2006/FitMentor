use axum::extract::State;
use axum::Json;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::auth::middleware::AuthUser;
use crate::AppState;

#[derive(Deserialize)]
pub struct LogRequest {
    pub user_message: String,
    pub reply: String,
    pub container_tag: String,
    pub session_id: Option<Uuid>,
}

#[derive(Serialize)]
pub struct LogResponse {
    pub ok: bool,
}

#[derive(FromRow)]
struct SessionRow {
    title: String,
    messages: serde_json::Value,
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

    if let Some(sid) = &req.session_id {
        let row = sqlx::query_as::<_, SessionRow>(
            "SELECT title, messages FROM chat_sessions WHERE id = $1 AND user_id = $2",
        )
        .bind(sid)
        .bind(&user_id)
        .fetch_optional(&state.pool)
        .await?;

        if let Some(s) = row {
            let mut msgs = s.messages.as_array().cloned().unwrap_or_default();
            msgs.push(serde_json::json!({"role": "user", "content": req.user_message}));
            msgs.push(serde_json::json!({"role": "assistant", "content": req.reply}));

            let new_title = if s.title == "New Chat" {
                let t = req.user_message.trim();
                if t.len() > 60 {
                    format!("{}…", &t[..60])
                } else {
                    t.to_string()
                }
            } else {
                s.title
            };

            sqlx::query(
                "UPDATE chat_sessions SET messages = $1, title = $2, updated_at = now() WHERE id = $3",
            )
            .bind(serde_json::Value::Array(msgs))
            .bind(&new_title)
            .bind(sid)
            .execute(&state.pool)
            .await?;
        }
    }

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
