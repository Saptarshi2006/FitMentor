use axum::extract::State;
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::auth::middleware::AuthUser;
use crate::AppState;

#[derive(Deserialize)]
pub struct CheckoutRequest {
    pub tier: String, // "premium" or "pro"
}

#[derive(Serialize)]
pub struct CheckoutResponse {
    pub checkout_url: String,
}

/// POST /v1/subscriptions/checkout — Create Polar.sh checkout session.
/// Ponytail: stub that returns placeholder URL.
pub async fn checkout(
    State(_state): State<AppState>,
    AuthUser { user_id, .. }: AuthUser,
    Json(req): Json<CheckoutRequest>,
) -> Result<Json<CheckoutResponse>, crate::error::AppError> {
    // TODO: POST https://api.polar.sh/v1/checkouts
    //   products: [POLAR_PRODUCT_ID for tier]
    //   success_url: "https://fitmentor.app/profile?checkout=success"
    //   metadata: { user_id, tier }

    if req.tier != "premium" && req.tier != "pro" {
        return Err(crate::error::AppError::BadRequest(
            "Invalid tier. Must be 'premium' or 'pro'.".into(),
        ));
    }

    let response = CheckoutResponse {
        checkout_url: format!(
            "https://buy.polar.sh/STUB_CHECKOUT_{}?tier={}",
            user_id, req.tier
        ),
    };

    Ok(Json(response))
}

// --- Webhook ---

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
pub struct PolarWebhook {
    pub r#type: String,
    pub data: serde_json::Value,
}

/// POST /v1/webhooks/polar — Handle Polar.sh webhook events.
/// Ponytail: logs events, TODO: verify signature + process.
pub async fn webhook_handler(
    State(_state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, crate::error::AppError> {
    let event_type = payload
        .get("type")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");

    tracing::info!("Polar webhook received: {event_type}");

    // TODO: Verify webhook signature with POLAR_WEBHOOK_SECRET
    // TODO: Process events:
    //   order.paid → upsert subscription, create TigerBeetle transfer
    //   subscription.active → update status
    //   subscription.canceled → set cancel_at_period_end
    //   subscription.revoked → set status = revoked
    //   refund.created → TigerBeetle transfer

    Ok(Json(serde_json::json!({ "received": true })))
}
