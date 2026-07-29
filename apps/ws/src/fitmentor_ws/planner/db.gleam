import fitmentor_ws/planner/types
import gleam/dynamic/decode
import gleam/option.{None}
import pog

type DBResult(a) = Result(a, String)

fn decoder_profile() -> decode.Decoder(types.Profile) {
  use user_id <- decode.field("user_id", decode.string)
  use name_ <- decode.field("name", decode.string)
  use age <- decode.field("age", decode.int)
  use gender <- decode.field("gender", decode.string)
  use height_cm <- decode.field("height_cm", decode.int)
  use weight_kg <- decode.field("weight_kg", decode.int)
  use goal <- decode.field("goal", decode.string)
  use place <- decode.field("place", decode.string)
  use experience <- decode.field("experience", decode.string)
  use diet <- decode.field("diet", decode.string)
  use days_per_week <- decode.field("days_per_week", decode.int)
  use budget_per_day <- decode.field("budget_per_day", decode.int)
  use health_conditions <- decode.field("health_conditions", decode.list(decode.string))
  use bmi <- decode.optional_field("bmi", None, decode.optional(decode.float))
  decode.success(types.Profile(
    user_id:, name_:, age:, gender:, height_cm:, weight_kg:,
    goal:, place:, experience:, diet:, days_per_week:,
    budget_per_day:, health_conditions:, bmi:,
  ))
}

fn decoder_user() -> decode.Decoder(types.User) {
  use id <- decode.field("id", decode.string)
  use cf_sub <- decode.field("cf_access_sub", decode.string)
  use name_ <- decode.field("name", decode.string)
  decode.success(types.User(uuid: id, cf_sub:, name_:))
}

fn decoder_daily_log() -> decode.Decoder(types.DailyLog) {
  use sleep <- decode.field("sleep", decode.int)
  use steps <- decode.field("steps", decode.int)
  use protein_g <- decode.field("protein_g", decode.int)
  use workout_done <- decode.field("workout_done", decode.bool)
  use weight_kg <- decode.optional_field("weight_kg", None, decode.optional(decode.float))
  decode.success(types.DailyLog(sleep:, steps:, protein_g:, workout_done:, weight_kg:))
}

pub fn get_user_by_cf_sub(
  db: pog.Connection,
  cf_sub: String,
) -> DBResult(types.User) {
  let query =
    pog.query("SELECT id, cf_access_sub, name FROM users WHERE cf_access_sub = $1")
    |> pog.parameter(pog.text(cf_sub))
    |> pog.returning(decoder_user())

  case pog.execute(query, on: db) {
    Ok(returned) -> {
      case returned.rows {
        [user] -> Ok(user)
        _ -> Error("user not found: " <> cf_sub)
      }
    }
    Error(_) -> Error("db query failed")
  }
}

pub fn get_profile(db: pog.Connection, user_uuid: String) -> DBResult(types.Profile) {
  let query =
    pog.query("SELECT * FROM profiles WHERE user_id = $1::uuid")
    |> pog.parameter(pog.text(user_uuid))
    |> pog.returning(decoder_profile())

  case pog.execute(query, on: db) {
    Ok(returned) -> {
      case returned.rows {
        [p] -> Ok(p)
        _ -> Error("profile not found for user: " <> user_uuid)
      }
    }
    Error(_) -> Error("db query failed")
  }
}

pub fn get_recent_logs(
  db: pog.Connection,
  user_uuid: String,
  days: Int,
) -> DBResult(List(types.DailyLog)) {
  let query =
    pog.query("SELECT sleep, steps, protein_g, workout_done, weight_kg FROM daily_logs WHERE user_id = $1::uuid ORDER BY date DESC LIMIT $2")
    |> pog.parameter(pog.text(user_uuid))
    |> pog.parameter(pog.int(days))
    |> pog.returning(decoder_daily_log())

  case pog.execute(query, on: db) {
    Ok(returned) -> Ok(returned.rows)
    Error(_) -> Error("db query failed")
  }
}

pub fn get_subscription_tier(db: pog.Connection, cf_sub: String) -> String {
  let query =
    pog.query("SELECT tier FROM subscriptions WHERE user_id = $1 AND status = 'active' LIMIT 1")
    |> pog.parameter(pog.text(cf_sub))
    |> pog.returning(decode.field("tier", decode.string, decode.success))

  case pog.execute(query, on: db) {
    Ok(returned) -> {
      case returned.rows {
        [tier] -> tier
        _ -> "free"
      }
    }
    Error(_) -> "free"
  }
}

pub fn check_plan_exists(
  db: pog.Connection,
  table: String,
  user_id: String,
  date_str: String,
) -> DBResult(Bool) {
  let sql = "SELECT 1 FROM " <> table <> " WHERE user_id = $1 AND date = $2 LIMIT 1"
  let query =
    pog.query(sql)
    |> pog.parameter(pog.text(user_id))
    |> pog.parameter(pog.text(date_str))
    |> pog.returning(decode.success(1))

  case pog.execute(query, on: db) {
    Ok(returned) -> Ok(returned.rows != [])
    Error(_) -> Error("db query failed")
  }
}

pub fn upsert_plan(
  db: pog.Connection,
  table: String,
  user_id: String,
  date_str: String,
  plan_json: String,
) -> DBResult(Int) {
  let sql = "INSERT INTO " <> table <> " (user_id, date, plan) VALUES ($1, $2, $3::jsonb) ON CONFLICT (user_id, date) DO UPDATE SET plan = EXCLUDED.plan, updated_at = now()"
  let query =
    pog.query(sql)
    |> pog.parameter(pog.text(user_id))
    |> pog.parameter(pog.text(date_str))
    |> pog.parameter(pog.text(plan_json))
    |> pog.returning(decode.success(1))

  case pog.execute(query, on: db) {
    Ok(returned) -> Ok(returned.count)
    Error(_) -> Error("db query failed")
  }
}
