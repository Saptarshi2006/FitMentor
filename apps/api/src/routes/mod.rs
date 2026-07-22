pub mod coach;
pub mod health;
pub mod logs;
pub mod payments;
pub mod user;

use axum::Router;

use crate::AppState;

pub fn routes(state: AppState) -> Router {
    Router::new()
        // Health
        .route("/v1/health", axum::routing::get(health::health))
        // User & Profile
        .route("/v1/user/me", axum::routing::get(user::get_me))
        .route("/v1/user/exists", axum::routing::get(user::check_user_exists))
        .route("/v1/user/profile", axum::routing::put(user::update_profile))
        .route(
            "/v1/user/profile/protein-target",
            axum::routing::put(user::update_protein_target),
        )
        // Daily Logs
        .route("/v1/logs/today", axum::routing::get(logs::get_today))
        .route("/v1/logs/today", axum::routing::put(logs::upsert_today))
        .route("/v1/logs", axum::routing::get(logs::get_range))
        .route("/v1/logs/streak", axum::routing::get(logs::get_streak))
        // AI Coach (Epic 6)
        .route("/v1/coach/chat", axum::routing::post(coach::chat))
        // Payments (Epic 7)
        .route(
            "/v1/subscriptions/checkout",
            axum::routing::post(payments::checkout),
        )
        .route(
            "/v1/webhooks/polar",
            axum::routing::post(payments::webhook_handler),
        )
        .with_state(state)
}
