use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};

use crate::auth::middleware::AuthUser;
use crate::error::AppError;
use crate::AppState;

const TOTAL_POOL: u64 = 10_000;
const TIER_MULTIPLIER: [f64; 3] = [1.0, 1.4, 2.0]; // [free, pro, premium]

fn tier_mult(tier: &str) -> f64 {
    match tier {
        "pro" => TIER_MULTIPLIER[1],
        "premium" => TIER_MULTIPLIER[2],
        _ => TIER_MULTIPLIER[0],
    }
}

fn tier_idx(tier: &str) -> &str {
    match tier {
        "pro" => "pro",
        "premium" => "premium",
        _ => "free",
    }
}

#[derive(Deserialize)]
pub struct CheckRequest {
    tier: String,
}

#[derive(Serialize)]
pub struct CheckResponse {
    allowed: bool,
    limit: u64,
    used: u64,
}

pub async fn check_and_consume(
    State(state): State<AppState>,
    AuthUser { user_id, .. }: AuthUser,
    Json(req): Json<CheckRequest>,
) -> Result<Json<CheckResponse>, AppError> {
    let mut conn = state
        .cache
        .get_conn()
        .ok_or(AppError::Internal(anyhow::anyhow!("Redis unavailable")))?;

    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let tier = tier_idx(&req.tier);

    // Register as active user if first request today
    let seen_key = format!("quota:ai:seen:{user_id}:{today}");
    let was_new: Option<String> = redis::cmd("SET")
        .arg(&seen_key)
        .arg("1")
        .arg("EX")
        .arg(86400u64)
        .arg("NX")
        .query_async(&mut conn)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Redis SET NX failed: {e}")))?;
    if was_new.is_some() {
        let active_key = format!("quota:ai:active:{tier}");
        let _: u64 = redis::cmd("INCR")
            .arg(&active_key)
            .query_async(&mut conn)
            .await
            .map_err(|e| AppError::Internal(anyhow::anyhow!("Redis INCR failed: {e}")))?;
        let _: () = redis::cmd("EXPIRE")
            .arg(&active_key)
            .arg(86400u64)
            .query_async(&mut conn)
            .await
            .map_err(|e| AppError::Internal(anyhow::anyhow!("Redis EXPIRE failed: {e}")))?;
    }

    // Step 3: Read active counts
    let free: u64 = state
        .cache
        .get("quota:ai:active:free")
        .await
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);
    let pro: u64 = state
        .cache
        .get("quota:ai:active:pro")
        .await
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);
    let premium: u64 = state
        .cache
        .get("quota:ai:active:premium")
        .await
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);

    // Step 4: Compute dynamic limit
    let weighted = free as f64 * TIER_MULTIPLIER[0]
        + pro as f64 * TIER_MULTIPLIER[1]
        + premium as f64 * TIER_MULTIPLIER[2];
    let multiplier = tier_mult(&req.tier);
    let limit = if weighted > 0.0 {
        (TOTAL_POOL as f64 * multiplier / weighted).floor() as u64
    } else {
        TOTAL_POOL
    };

    // Step 5: Check daily quota + consume
    let usage_key = format!("quota:ai:user:{user_id}:{today}");
    let used: u64 = state
        .cache
        .get(&usage_key)
        .await
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);

    if used >= limit {
        return Ok(Json(CheckResponse {
            allowed: false,
            limit,
            used,
        }));
    }

    let _: u64 = redis::cmd("INCR")
        .arg(&usage_key)
        .query_async(&mut conn)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Redis INCR failed: {e}")))?;
    let _: () = redis::cmd("EXPIRE")
        .arg(&usage_key)
        .arg(86400u64)
        .query_async(&mut conn)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Redis EXPIRE failed: {e}")))?;

    Ok(Json(CheckResponse {
        allowed: true,
        limit,
        used: used + 1,
    }))
}
