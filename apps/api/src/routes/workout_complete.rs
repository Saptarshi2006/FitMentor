use axum::{extract::State, Json};
use chrono::Utc;
use serde::{Deserialize, Serialize};

use crate::auth::middleware::AuthUser;
use crate::error::AppError;
use crate::AppState;

#[derive(Deserialize)]
pub struct WorkoutCompleteRequest {
    pub day_index: i16,
    pub title: String,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct WorkoutCompletionItem {
    pub day_index: i16,
    pub title: String,
}

/// POST /v1/workout/complete — mark a workout day as completed.
pub async fn complete(
    State(state): State<AppState>,
    AuthUser { user_id, .. }: AuthUser,
    Json(req): Json<WorkoutCompleteRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
<<<<<<< Updated upstream
=======
    let pool = state.shard_router.get_pool_for_user(&user_id);
>>>>>>> Stashed changes
    let today = Utc::now().date_naive();

    let uuid: uuid::Uuid = sqlx::query_scalar(
        "SELECT id FROM users WHERE cf_access_sub = $1",
    )
    .bind(&user_id)
<<<<<<< Updated upstream
    .fetch_one(&state.pool)
=======
    .fetch_one(pool)
>>>>>>> Stashed changes
    .await?;

    sqlx::query(
        "INSERT INTO workout_completions (user_id, date, day_index, title)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, date, day_index) DO NOTHING",
    )
    .bind(uuid)
    .bind(today)
    .bind(req.day_index)
    .bind(&req.title)
<<<<<<< Updated upstream
    .execute(&state.pool)
=======
    .execute(pool)
>>>>>>> Stashed changes
    .await?;

    Ok(Json(serde_json::json!({"ok": true})))
}

/// GET /v1/workout/completions — get today's completed workout days.
pub async fn completions(
    State(state): State<AppState>,
    AuthUser { user_id, .. }: AuthUser,
) -> Result<Json<serde_json::Value>, AppError> {
<<<<<<< Updated upstream
=======
    let pool = state.shard_router.get_pool_for_user(&user_id);
>>>>>>> Stashed changes
    let today = Utc::now().date_naive();

    let uuid: uuid::Uuid = sqlx::query_scalar(
        "SELECT id FROM users WHERE cf_access_sub = $1",
    )
    .bind(&user_id)
<<<<<<< Updated upstream
    .fetch_one(&state.pool)
=======
    .fetch_one(pool)
>>>>>>> Stashed changes
    .await?;

    let rows = sqlx::query_as::<_, WorkoutCompletionItem>(
        "SELECT day_index, title FROM workout_completions
         WHERE user_id = $1 AND date = $2",
    )
    .bind(uuid)
    .bind(today)
<<<<<<< Updated upstream
    .fetch_all(&state.pool)
=======
    .fetch_all(pool)
>>>>>>> Stashed changes
    .await?;

    Ok(Json(serde_json::json!({ "data": { "completions": rows } })))
}
