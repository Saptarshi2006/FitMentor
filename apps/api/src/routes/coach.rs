use axum::extract::State;
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::auth::middleware::AuthUser;
use crate::AppState;

#[derive(Deserialize)]
pub struct CoachRequest {
    pub messages: Vec<ChatMessage>,
    pub session_id: Option<String>,
}

#[derive(Serialize)]
pub struct CoachResponse {
    pub content: String,
    pub session_id: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

/// POST /v1/coach/chat — AI coach chat endpoint.
/// Streams response via WebSocket (Epic 6.3).
/// For now, returns a stub response.
pub async fn chat(
    State(_state): State<AppState>,
    AuthUser { user_id: _, .. }: AuthUser,
    Json(req): Json<CoachRequest>,
) -> Result<Json<CoachResponse>, crate::error::AppError> {
    let session_id = req
        .session_id
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    // TODO: 1. Get user context from Supermemory
    // TODO: 2. Build system prompt + user messages
    // TODO: 3. Stream LLM response via Redis Pub/Sub → WebSocket
    // TODO: 4. Ingest conversation summary to Supermemory
    // TODO: 5. Store messages in MongoDB

    let response = CoachResponse {
        content: format!(
            "Coach stub: received {} messages. Set SUPERMEMORY_API_KEY and LLM_API_KEY to enable.",
            req.messages.len()
        ),
        session_id,
    };

    Ok(Json(response))
}
