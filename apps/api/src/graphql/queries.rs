use async_graphql::{InputObject, Object};
use chrono::{NaiveDate, Utc};
use uuid::Uuid;

use super::context::GqlContext;
use super::types::*;

#[derive(InputObject)]
pub struct DateRangeInput {
    pub from: NaiveDate,
    pub to: NaiveDate,
}

pub struct QueryRoot;

#[Object]
impl QueryRoot {
    async fn me(&self, ctx: &async_graphql::Context<'_>) -> async_graphql::Result<GqlUserWithProfile> {
        let gql_ctx = ctx.data::<GqlContext>()?;
        let auth = gql_ctx.require_user()?;
        let user = upsert_user(&gql_ctx.pool, &auth.user_id, &auth.email).await?;
        let _ = sqlx::query("INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING")
            .bind(user.id).execute(&gql_ctx.pool).await;
        let profile = sqlx::query_as::<_, crate::models::profile::Profile>(
            "SELECT id, user_id, name, age, gender, height_cm, weight_kg, goal, place, experience, diet, days_per_week, budget_per_day, health_conditions, custom_protein_g, created_at, updated_at FROM profiles WHERE user_id = $1"
        ).bind(user.id).fetch_optional(&gql_ctx.pool).await?;
        Ok(GqlUserWithProfile {
            user: GqlUser { id: user.id, cf_access_sub: user.cf_access_sub, email: user.email, name: user.name, created_at: user.created_at, updated_at: user.updated_at },
            profile: profile.map(|p| GqlProfile { id: p.id, user_id: p.user_id, name: p.name, age: p.age, gender: p.gender, height_cm: p.height_cm, weight_kg: p.weight_kg, goal: p.goal, place: p.place, experience: p.experience, diet: p.diet, days_per_week: p.days_per_week, budget_per_day: p.budget_per_day, health_conditions: p.health_conditions, custom_protein_g: p.custom_protein_g, created_at: p.created_at, updated_at: p.updated_at }),
        })
    }

    async fn today_log(&self, ctx: &async_graphql::Context<'_>) -> async_graphql::Result<Option<GqlDailyLog>> {
        let gql_ctx = ctx.data::<GqlContext>()?;
        let auth = gql_ctx.require_user()?;
        let user = get_user_id(&gql_ctx.pool, &auth.user_id).await?;
        let today = Utc::now().date_naive();
        let log = sqlx::query_as::<_, crate::models::daily_log::DailyLog>(
            "SELECT id, user_id, date, water, sleep, steps, protein_g, workout_done, weight_kg, created_at, updated_at FROM daily_logs WHERE user_id = $1 AND date = $2"
        ).bind(user.id).bind(today).fetch_optional(&gql_ctx.pool).await?;
        Ok(log.map(|l| GqlDailyLog { id: l.id, user_id: l.user_id, date: l.date, water: l.water, sleep: l.sleep, steps: l.steps, protein_g: l.protein_g, workout_done: l.workout_done, weight_kg: l.weight_kg, created_at: l.created_at, updated_at: l.updated_at }))
    }

    async fn logs(&self, ctx: &async_graphql::Context<'_>, input: DateRangeInput) -> async_graphql::Result<Vec<GqlDailyLog>> {
        let gql_ctx = ctx.data::<GqlContext>()?;
        let auth = gql_ctx.require_user()?;
        let user = get_user_id(&gql_ctx.pool, &auth.user_id).await?;
        let logs = sqlx::query_as::<_, crate::models::daily_log::DailyLog>(
            "SELECT id, user_id, date, water, sleep, steps, protein_g, workout_done, weight_kg, created_at, updated_at FROM daily_logs WHERE user_id = $1 AND date >= $2 AND date <= $3 ORDER BY date DESC"
        ).bind(user.id).bind(input.from).bind(input.to).fetch_all(&gql_ctx.pool).await?;
        Ok(logs.into_iter().map(|l| GqlDailyLog { id: l.id, user_id: l.user_id, date: l.date, water: l.water, sleep: l.sleep, steps: l.steps, protein_g: l.protein_g, workout_done: l.workout_done, weight_kg: l.weight_kg, created_at: l.created_at, updated_at: l.updated_at }).collect())
    }

    async fn streak(&self, ctx: &async_graphql::Context<'_>) -> async_graphql::Result<GqlStreak> {
        let gql_ctx = ctx.data::<GqlContext>()?;
        let auth = gql_ctx.require_user()?;
        let user = get_user_id(&gql_ctx.pool, &auth.user_id).await?;
        #[derive(sqlx::FromRow)]
        struct DateRow { date: NaiveDate }
        let rows = sqlx::query_as::<_, DateRow>("SELECT date FROM daily_logs WHERE user_id = $1 AND workout_done = true ORDER BY date DESC LIMIT 100")
            .bind(user.id).fetch_all(&gql_ctx.pool).await?;
        let mut current: i32 = 0;
        let mut expected = Utc::now().date_naive();
        for row in &rows {
            if row.date == expected { current += 1; expected = expected - chrono::Duration::days(1); } else { break; }
        }
        Ok(GqlStreak { current, longest: current })
    }

    async fn today_ai_plan(&self, ctx: &async_graphql::Context<'_>, table: String) -> async_graphql::Result<Option<GqlAiPlan>> {
        let gql_ctx = ctx.data::<GqlContext>()?;
        let auth = gql_ctx.require_user()?;
        let today = Utc::now().date_naive();
        let valid = ["meal_plans","workout_plans","bmi_advice","sleep_advice","injury_advice","form_advice"];
        if !valid.contains(&table.as_str()) { return Err(async_graphql::Error::new("Invalid table")); }
        #[derive(sqlx::FromRow)]
        struct PlanRow { id: Uuid, user_id: String, date: NaiveDate, plan: serde_json::Value }
        let row = sqlx::query_as::<_, PlanRow>(&format!("SELECT id, user_id, date, plan FROM {table} WHERE user_id = $1 AND date = $2"))
            .bind(&auth.user_id).bind(today).fetch_optional(&gql_ctx.pool).await?;
        Ok(row.map(|r| GqlAiPlan { id: r.id, user_id: r.user_id, date: r.date, plan: r.plan }))
    }

    async fn coach_sessions(&self, ctx: &async_graphql::Context<'_>) -> async_graphql::Result<Vec<GqlSessionListItem>> {
        let gql_ctx = ctx.data::<GqlContext>()?;
        let auth = gql_ctx.require_user()?;
        #[derive(sqlx::FromRow)]
        struct Row { id: Uuid, title: String, messages: serde_json::Value }
        let rows = sqlx::query_as::<_, Row>("SELECT id, title, messages FROM chat_sessions WHERE user_id = $1 ORDER BY updated_at DESC")
            .bind(&auth.user_id).fetch_all(&gql_ctx.pool).await?;
        Ok(rows.into_iter().map(|r| GqlSessionListItem { id: r.id, title: r.title, message_count: r.messages.as_array().map(|a| a.len() as i32).unwrap_or(0) }).collect())
    }

    async fn coach_session(&self, ctx: &async_graphql::Context<'_>, id: Uuid) -> async_graphql::Result<Option<GqlChatSession>> {
        let gql_ctx = ctx.data::<GqlContext>()?;
        let auth = gql_ctx.require_user()?;
        #[derive(sqlx::FromRow)]
        struct Row { id: Uuid, user_id: String, title: String, messages: serde_json::Value }
        let row = sqlx::query_as::<_, Row>("SELECT id, user_id, title, messages FROM chat_sessions WHERE id = $1 AND user_id = $2")
            .bind(id).bind(&auth.user_id).fetch_optional(&gql_ctx.pool).await?;
        Ok(row.map(|r| GqlChatSession { id: r.id, user_id: r.user_id, title: r.title, messages: r.messages }))
    }
}

async fn get_user_id(pool: &sqlx::PgPool, cf_sub: &str) -> async_graphql::Result<crate::models::user::User> {
    sqlx::query_as::<_, crate::models::user::User>("SELECT id, cf_access_sub, email, name, created_at, updated_at FROM users WHERE cf_access_sub = $1")
        .bind(cf_sub).fetch_one(pool).await.map_err(|e| async_graphql::Error::new(e.to_string()))
}

async fn upsert_user(pool: &sqlx::PgPool, cf_sub: &str, email: &str) -> async_graphql::Result<crate::models::user::User> {
    sqlx::query_as::<_, crate::models::user::User>(
        "INSERT INTO users (cf_access_sub, email) VALUES ($1, $2) ON CONFLICT (cf_access_sub) DO UPDATE SET email = EXCLUDED.email, updated_at = now() RETURNING id, cf_access_sub, email, name, created_at, updated_at"
    ).bind(cf_sub).bind(email).fetch_one(pool).await.map_err(|e| async_graphql::Error::new(e.to_string()))
}
