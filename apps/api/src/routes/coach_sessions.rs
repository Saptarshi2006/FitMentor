use axum::extract::{Path, State};
use axum::Json;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::auth::middleware::AuthUser;
use crate::AppState;

#[derive(Serialize, FromRow)]
pub struct SessionRow {
    pub id: Uuid,
    pub user_id: String,
    pub title: String,
    pub messages: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Serialize)]
pub struct SessionListItem {
    pub id: Uuid,
    pub title: String,
    pub message_count: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Serialize)]
pub struct CreateResponse {
    pub id: Uuid,
}

#[derive(Deserialize)]
pub struct CreateRequest {
    pub title: Option<String>,
}

/// POST /v1/coach/sessions — create a new empty session.
pub async fn create(
    State(state): State<AppState>,
    AuthUser { user_id, .. }: AuthUser,
    Json(req): Json<CreateRequest>,
) -> Result<Json<CreateResponse>, crate::error::AppError> {
    let title = req.title.unwrap_or_else(|| "New Chat".into());
    let id = sqlx::query_scalar::<_, Uuid>(
        "INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING id",
    )
    .bind(&user_id)
    .bind(&title)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(CreateResponse { id }))
}

/// GET /v1/coach/sessions — list user's sessions (most recent first).
pub async fn list(
    State(state): State<AppState>,
    AuthUser { user_id, .. }: AuthUser,
) -> Result<Json<Vec<SessionListItem>>, crate::error::AppError> {
    let rows = sqlx::query_as::<_, SessionRow>(
        "SELECT id, user_id, title, messages, created_at, updated_at
         FROM chat_sessions
         WHERE user_id = $1
         ORDER BY updated_at DESC",
    )
    .bind(&user_id)
    .fetch_all(&state.pool)
    .await?;

    let items = rows
        .into_iter()
        .map(|r| {
            let msg_count = r
                .messages
                .as_array()
                .map(|a| a.len() as i32)
                .unwrap_or(0);
            SessionListItem {
                id: r.id,
                title: r.title,
                message_count: msg_count,
                created_at: r.created_at,
            }
        })
        .collect();

    Ok(Json(items))
}

/// GET /v1/coach/sessions/:id — get a full session (only if owned by user).
pub async fn get(
    State(state): State<AppState>,
    AuthUser { user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<SessionRow>, crate::error::AppError> {
    let row = sqlx::query_as::<_, SessionRow>(
        "SELECT id, user_id, title, messages, created_at, updated_at
         FROM chat_sessions WHERE id = $1 AND user_id = $2",
    )
    .bind(id)
    .bind(&user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(crate::error::AppError::NotFound)?;

    Ok(Json(row))
}

/// DELETE /v1/coach/sessions/:id — delete a session (only if owned by user).
pub async fn delete(
    State(state): State<AppState>,
    AuthUser { user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, crate::error::AppError> {
    let result = sqlx::query("DELETE FROM chat_sessions WHERE id = $1 AND user_id = $2")
        .bind(id)
        .bind(&user_id)
        .execute(&state.pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(crate::error::AppError::NotFound);
    }

    Ok(Json(serde_json::json!({"ok": true})))
}
