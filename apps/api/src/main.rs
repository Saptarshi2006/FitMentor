mod auth;
mod config;
mod db;
mod error;
mod graphql;
mod models;
mod routes;
mod services;

use auth::jwt::JwtValidator;
use axum::http::header;
use axum::http::Method;
use axum::Router;
use config::Config;
use graphql::schema::create_schema;
use sqlx::PgPool;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::EnvFilter;

use crate::services::cache::CacheService;

async fn graphiql() -> impl axum::response::IntoResponse {
    axum::response::Html(async_graphql::http::GraphiQLSource::build().endpoint("/graphql").finish())
}

async fn graphql_handler(
    state: axum::extract::State<AppState>,
    headers: axum::http::HeaderMap,
    req: async_graphql_axum::GraphQLRequest,
) -> async_graphql_axum::GraphQLResponse {
    let schema = create_schema();
    let user = extract_auth_user(&state, &headers).await;
    let gql_ctx = graphql::context::GqlContext::new(&state, user);
    schema.execute(req.into_inner().data(gql_ctx)).await.into()
}

async fn extract_auth_user(
    state: &AppState,
    headers: &axum::http::HeaderMap,
) -> Option<auth::middleware::AuthUser> {
    // API key auth (server-to-server)
    if !state.api_shared_secret.is_empty() {
        if let Some(api_key) = headers.get("x-api-key").and_then(|v| v.to_str().ok()) {
            if api_key == state.api_shared_secret {
                let user_id = headers.get("x-user-id").and_then(|v| v.to_str().ok()).unwrap_or("").to_string();
                let email = headers.get("x-user-email").and_then(|v| v.to_str().ok()).unwrap_or("").to_string();
                return Some(auth::middleware::AuthUser { user_id, email });
            }
        }
    }
    // JWT auth (Authorization or cf-access-jwt-assertion header)
    if let Some(token) = headers.get("cf-access-jwt-assertion").or_else(|| headers.get("authorization")).and_then(|v| v.to_str().ok()).and_then(|s| s.strip_prefix("Bearer ").or(Some(s))) {
        if let Ok(claims) = state.jwt_validator.validate(token).await {
            return Some(auth::middleware::AuthUser { user_id: claims.sub, email: claims.email });
        }
    }
    // Session cookie auth (browser requests)
    if let Some(cookie) = headers.get("cookie").and_then(|v| v.to_str().ok()) {
        for part in cookie.split(';') {
            let part = part.trim();
            if let Some(sid) = part.strip_prefix("fitmentor_session=") {
                if let Some(data) = state.cache.get(&format!("session:{}", sid)).await {
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&data) {
                        let user_id = json["sub"].or_else(|| json["cf_sub"]).and_then(|v| v.as_str().map(String::from)).unwrap_or_default();
                        let email = json["email"].as_str().unwrap_or("").to_string();
                        let name = json["name"].as_str().unwrap_or("").to_string();
                        if !user_id.is_empty() {
                            // Auto-create user on first visit
                            let _ = sqlx::query(
                                "INSERT INTO users (cf_access_sub, email, name) VALUES ($1, $2, $3) ON CONFLICT (cf_access_sub) DO UPDATE SET email = EXCLUDED.email, name = COALESCE(EXCLUDED.name, users.name), updated_at = now()"
                            )
                            .bind(&user_id)
                            .bind(&email)
                            .bind(&name)
                            .execute(&state.pool)
                            .await;
                            return Some(auth::middleware::AuthUser { user_id, email });
                        }
                    }
                }
            }
        }
    }
    None
}

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub cache: CacheService,
    pub jwt_validator: Arc<JwtValidator>,
    pub polar_access_token: String,
    pub polar_webhook_secret: String,
    pub polar_premium_product_id: String,
    pub polar_premium_price_id: String,
    pub polar_pro_product_id: String,
    pub polar_pro_price_id: String,
    pub api_shared_secret: String,
    pub planner_url: String,
}

async fn run_migrations(pool: &PgPool) {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS meal_plans (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id    TEXT NOT NULL,
            date       DATE NOT NULL,
            plan       JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        "#,
    )
    .execute(pool)
    .await
    .expect("failed to create meal_plans table");

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS workout_plans (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id    TEXT NOT NULL,
            date       DATE NOT NULL,
            plan       JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        "#,
    )
    .execute(pool)
    .await
    .expect("failed to create workout_plans table");

    sqlx::query(
        r#"CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_plans_user_date ON meal_plans(user_id, date)"#,
    )
    .execute(pool)
    .await
    .expect("failed to create meal_plans index");

    sqlx::query(
        r#"CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_plans_user_date ON workout_plans(user_id, date)"#,
    )
    .execute(pool)
    .await
    .expect("failed to create workout_plans index");

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS bmi_advice (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id    TEXT NOT NULL,
            date       DATE NOT NULL,
            plan       JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        "#,
    )
    .execute(pool)
    .await
    .expect("failed to create bmi_advice table");

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS sleep_advice (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id    TEXT NOT NULL,
            date       DATE NOT NULL,
            plan       JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        "#,
    )
    .execute(pool)
    .await
    .expect("failed to create sleep_advice table");

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS injury_advice (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id    TEXT NOT NULL,
            date       DATE NOT NULL,
            plan       JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        "#,
    )
    .execute(pool)
    .await
    .expect("failed to create injury_advice table");

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS form_advice (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id    TEXT NOT NULL,
            date       DATE NOT NULL,
            plan       JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ not null default now()
        );
        "#,
    )
    .execute(pool)
    .await
    .expect("failed to create form_advice table");

    sqlx::query(r#"CREATE UNIQUE INDEX IF NOT EXISTS idx_bmi_advice_user_date ON bmi_advice(user_id, date)"#)
        .execute(pool).await.expect("failed to create bmi_advice index");
    sqlx::query(r#"CREATE UNIQUE INDEX IF NOT EXISTS idx_sleep_advice_user_date ON sleep_advice(user_id, date)"#)
        .execute(pool).await.expect("failed to create sleep_advice index");
    sqlx::query(r#"CREATE UNIQUE INDEX IF NOT EXISTS idx_injury_advice_user_date ON injury_advice(user_id, date)"#)
        .execute(pool).await.expect("failed to create injury_advice index");
    sqlx::query(r#"CREATE UNIQUE INDEX IF NOT EXISTS idx_form_advice_user_date ON form_advice(user_id, date)"#)
        .execute(pool).await.expect("failed to create form_advice index");

    tracing::info!("migrations complete");
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let config = Config::from_env();

    let pool = db::create_pool(&config.database_url)
        .await
        .expect("failed to connect to database");

    run_migrations(&pool).await;

    let cache = services::cache::CacheService::new(&config.redis_url).await;

    let jwt_validator = Arc::new(JwtValidator::new(
        config.cf_access_team_domain,
        config.cf_access_aud,
    ));

    let state = AppState {
        pool,
        cache,
        jwt_validator,
        polar_access_token: config.polar_access_token,
        polar_webhook_secret: config.polar_webhook_secret,
        polar_premium_product_id: config.polar_premium_product_id,
        polar_premium_price_id: config.polar_premium_price_id,
        polar_pro_product_id: config.polar_pro_product_id,
        polar_pro_price_id: config.polar_pro_price_id,
        api_shared_secret: config.api_shared_secret,
        planner_url: config.planner_url,
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([
            header::AUTHORIZATION,
            header::CONTENT_TYPE,
            header::ACCEPT,
            header::COOKIE,
            header::SET_COOKIE,
            "cf-access-jwt-assertion".parse().unwrap(),
            "x-api-key".parse().unwrap(),
            "x-user-id".parse().unwrap(),
            "x-user-email".parse().unwrap(),
        ])
        .allow_credentials(true);

    let app = routes::routes()
        .merge(Router::new().route("/graphql", axum::routing::get(graphiql).post(graphql_handler)))
        .layer(cors)
        .with_state(state);

    let addr = format!("0.0.0.0:{}", config.port);
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("failed to bind");

    tracing::info!("listening on {addr}");
    axum::serve(listener, app).await.expect("server error");
}
