use axum::extract::State;
use axum::http::HeaderMap;
use axum::Json;
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;

use crate::auth::middleware::AuthUser;
use crate::AppState;

type HmacSha256 = Hmac<Sha256>;

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
/// Verifies the HMAC-SHA256 signature (polar-signature header) then logs.
pub async fn webhook_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: axum::body::Bytes,
) -> Result<Json<serde_json::Value>, crate::error::AppError> {
    let secret = &state.polar_webhook_secret;
    if !secret.is_empty() {
        let signature = headers
            .get("polar-signature")
            .and_then(|v| v.to_str().ok())
            .ok_or(crate::error::AppError::Unauthorized)?;

        let mut mac =
            HmacSha256::new_from_slice(secret.as_bytes())
                .map_err(|e| crate::error::AppError::Internal(e.into()))?;
        mac.update(&body);
        let expected = hex::encode(mac.finalize().into_bytes());

        let provided = signature.trim_start_matches("sha256=");
        if !constant_time_eq(provided, &expected) {
            return Err(crate::error::AppError::Unauthorized);
        }
    }

    let payload: serde_json::Value = serde_json::from_slice(&body)
        .map_err(|e| crate::error::AppError::BadRequest(e.to_string()))?;

    let event_type = payload
        .get("type")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");

    tracing::info!("Polar webhook received: {event_type}");

    // TODO: Process events:
    //   order.paid → upsert subscription, create TigerBeetle transfer
    //   subscription.active → update status
    //   subscription.canceled → set cancel_at_period_end
    //   subscription.revoked → set status = revoked
    //   refund.created → TigerBeetle transfer

    Ok(Json(serde_json::json!({ "received": true })))
}

/// Constant-time string comparison to avoid timing attacks.
fn constant_time_eq(a: &str, b: &str) -> bool {
    let a = a.as_bytes();
    let b = b.as_bytes();
    if a.len() != b.len() {
        return false;
    }
    let mut diff = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        diff |= x ^ y;
    }
    diff == 0
}
