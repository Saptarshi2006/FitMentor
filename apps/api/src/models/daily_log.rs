use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct DailyLog {
    pub id: i32,
    pub user_id: i32,
    pub date: NaiveDate,
    pub water: i32,
    pub sleep: f32,
    pub steps: i32,
    pub protein_g: f32,
    pub workout_done: bool,
    pub weight_kg: Option<f32>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDailyLog {
    pub water: Option<i32>,
    pub sleep: Option<f32>,
    pub steps: Option<i32>,
    pub protein_g: Option<f32>,
    pub workout_done: Option<bool>,
    pub weight_kg: Option<f32>,
}
