import fitmentor_ws/planner/ai.{type AIError, call_ai}
import fitmentor_ws/planner/db
import fitmentor_ws/planner/quota
import fitmentor_ws/planner/types
import gleam/float
import gleam/int
import gleam/json
import gleam/list
import gleam/string
import pog

pub fn handle(user_id: String, db_conn: pog.Connection) -> String {
  case quota.check_quota(user_id) {
    False -> json_error("quota exceeded")
    True -> run_generation(user_id, db_conn)
  }
}

fn run_generation(user_id: String, db_conn: pog.Connection) -> String {
  case db.get_user_by_cf_sub(db_conn, user_id) {
    Error(_) -> json_error("user not found")
    Ok(user) -> {
      case db.get_profile(db_conn, user.uuid) {
        Error(_) -> json_error("profile not found")
        Ok(profile) -> {
          let logs = case db.get_recent_logs(db_conn, user.uuid, 7) {
            Ok(l) -> l
            Error(_) -> []
          }

          let today = today_str()
          let tables = types.all_tables()

          let existing = list.filter_map(tables, fn(t) {
            case db.check_plan_exists(db_conn, types.table_name(t), user_id, today) {
              Ok(True) -> Ok(types.table_name(t))
              _ -> Error(Nil)
            }
          })

          let missing = list.filter(tables, fn(t) {
            !list.contains(existing, types.table_name(t))
          })

          let generated = list.filter_map(missing, fn(table) {
            case generate_and_save(db_conn, table, user_id, today, profile, logs) {
              Ok(_) -> Ok(types.table_name(table))
              Error(_) -> Error(Nil)
            }
          })

          json.object([
            #("status", json.string("ok")),
            #("existing", json.array(existing, of: json.string)),
            #("generated", json.array(generated, of: json.string)),
          ])
          |> json.to_string
        }
      }
    }
  }
}

fn generate_and_save(
  db_conn: pog.Connection,
  table: types.AIPlanTable,
  user_id: String,
  date_str: String,
  profile: types.Profile,
  logs: List(types.DailyLog),
) -> Result(Int, Nil) {
  let plan_str = case table {
    types.MealPlans -> generate_meal_plan(profile, logs)
    types.WorkoutPlans -> generate_workout_plan(profile, logs)
    types.BmiAdvice -> generate_bmi_advice(profile)
    types.SleepAdvice -> generate_sleep_advice(profile, logs)
    types.InjuryAdvice -> generate_injury_prevention(profile)
    types.FormAdvice -> generate_form_tips(profile)
  }

  case plan_str {
    Ok(p) -> {
      case db.upsert_plan(db_conn, types.table_name(table), user_id, date_str, p) {
        Ok(count) -> Ok(count)
        Error(_) -> Error(Nil)
      }
    }
    Error(_) -> Error(Nil)
  }
}

fn json_error(msg: String) -> String {
  json.object([#("error", json.string(msg))]) |> json.to_string
}

fn health_str(profile: types.Profile) -> String {
  case profile.health_conditions {
    [] -> "none"
    h -> string.join(h, ", ")
  }
}

fn avg_sleep(logs: List(types.DailyLog)) -> Float {
  let vals = list.filter_map(logs, fn(l) {
    case l.sleep {
      0 -> Error(Nil)
      s -> Ok(int.to_float(s))
    }
  })
  case vals {
    [] -> 7.0
    _ -> {
      let sum = list.fold(vals, 0.0, fn(a, b) { a +. b })
      sum /. int.to_float(list.length(vals))
    }
  }
}

fn avg_steps(logs: List(types.DailyLog)) -> Int {
  let vals = list.filter_map(logs, fn(l) {
    case l.steps {
      0 -> Error(Nil)
      s -> Ok(s)
    }
  })
  case vals {
    [] -> 0
    _ -> {
      let sum = list.fold(vals, 0, fn(a, b) { a + b })
      sum / list.length(vals)
    }
  }
}

fn workout_days(logs: List(types.DailyLog)) -> Int {
  list.length(list.filter(logs, fn(l) { l.workout_done }))
}

fn avg_protein(logs: List(types.DailyLog)) -> Int {
  let vals = list.filter_map(logs, fn(l) {
    case l.protein_g {
      0 -> Error(Nil)
      p -> Ok(p)
    }
  })
  case vals {
    [] -> 0
    _ -> {
      let sum = list.fold(vals, 0, fn(a, b) { a + b })
      sum / list.length(vals)
    }
  }
}

fn generate_meal_plan(profile: types.Profile, logs: List(types.DailyLog)) -> Result(String, AIError) {
  let system = "You are a meal planner for Indian beginners. Return a JSON object with a \"meals\" array (4 items: Breakfast, Lunch, Snack, Dinner). Each meal has name (string), items (string), kcal (number), protein (number). Example: {\"meals\":[{\"name\":\"Poha\",\"items\":\"poha, peanuts, onion\",\"kcal\":400,\"protein\":12}]}. Return ONLY the JSON object, no markdown."
  let h = health_str(profile)
  let prompt = "Diet: " <> profile.diet <> ", budget: INR " <> int.to_string(profile.budget_per_day) <> "/day, health: " <> h
  let logs_context = ". Recent 7 days: avg_sleep=" <> float.to_string(avg_sleep(logs)) <> "h, avg_steps=" <> int.to_string(avg_steps(logs)) <> ", avg_protein=" <> int.to_string(avg_protein(logs)) <> "g, workout_days=" <> int.to_string(workout_days(logs))

  case call_ai(system, prompt <> logs_context, 2048) {
    Ok(result_str) -> {
      Ok("[{\"id\":\"plan-" <> today_str() <> "\",\"title\":\"Today's Plan\",\"budgetPerDay\":" <> int.to_string(profile.budget_per_day) <> ",\"diet\":\"" <> profile.diet <> "\",\"meals\":" <> result_str <> "}]")
    }
    Error(e) -> Error(e)
  }
}

fn generate_workout_plan(profile: types.Profile, logs: List(types.DailyLog)) -> Result(String, AIError) {
  let days = profile.days_per_week
  let system = "You are a fitness coach for Indian beginners. Generate a JSON workout plan (" <> int.to_string(days) <> " days). Each day has title, focus, exercises[]. Each exercise has name (string), sets (number), reps (string), rest (string), muscles (string[]), tips (string), alt (string). Return ONLY the JSON array. Be very concise."
  let h = health_str(profile)
  let prompt = "Goal: " <> profile.goal <> ", place: " <> profile.place <> ", experience: " <> profile.experience <> ", health: " <> h
  let logs_context = ". Recent 7 days: workout_days=" <> int.to_string(workout_days(logs)) <> ", avg_sleep=" <> float.to_string(avg_sleep(logs)) <> "h, avg_steps=" <> int.to_string(avg_steps(logs))

  case call_ai(system, prompt <> logs_context, 2048) {
    Ok(result_str) -> Ok(result_str)
    Error(e) -> Error(e)
  }
}

fn generate_bmi_advice(profile: types.Profile) -> Result(String, AIError) {
  let bmi = calc_bmi(profile)
  let category = case bmi {
    b if b <. 18.5 -> "Underweight"
    b if b <. 25.0 -> "Normal"
    b if b <. 30.0 -> "Overweight"
    _ -> "Obese"
  }

  let system = "You are a fitness and nutrition coach. Give personalized advice based on BMI and goals."
  let prompt = "BMI: " <> float.to_string(bmi) <> " (" <> category <> "), Goal: " <> profile.goal <> ", Diet: " <> profile.diet <> ", Place: " <> profile.place <> ". Give 3-4 specific tips. Return ONLY a JSON array of strings, e.g. [\"tip1\", \"tip2\", \"tip3\"]. No markdown."

  case call_ai(system, prompt, 1024) {
    Ok(result_str) -> Ok(result_str)
    Error(e) -> Error(e)
  }
}

fn calc_bmi(profile: types.Profile) -> Float {
  let h_m = int.to_float(profile.height_cm) /. 100.0
  case h_m >. 0.0 {
    True -> int.to_float(float.round(int.to_float(profile.weight_kg) /. h_m /. h_m))
    False -> 21.0
  }
}

fn generate_sleep_advice(_profile: types.Profile, logs: List(types.DailyLog)) -> Result(String, AIError) {
  let avg = avg_sleep(logs)
  let system = "You are a sleep coach. Analyze sleep patterns and give personalized tips."
  let prompt = "Average sleep: " <> float.to_string(avg) <> "h over last " <> int.to_string(list.length(logs)) <> " days. Give 3 specific tips. Return ONLY a JSON array of strings, e.g. [\"tip1\", \"tip2\", \"tip3\"]. No markdown."

  case call_ai(system, prompt, 1024) {
    Ok(result_str) -> Ok(result_str)
    Error(e) -> Error(e)
  }
}

fn generate_injury_prevention(profile: types.Profile) -> Result(String, AIError) {
  let system = "You are a physio therapist. Give general injury prevention advice."
  let prompt = "Experience: " <> profile.experience <> ", Place: " <> profile.place <> ", Goal: " <> profile.goal <> ". Give 3 general injury prevention tips. Return ONLY a JSON array of strings, e.g. [\"tip1\", \"tip2\", \"tip3\"]. No markdown."

  case call_ai(system, prompt, 1024) {
    Ok(result_str) -> Ok(result_str)
    Error(e) -> Error(e)
  }
}

fn generate_form_tips(profile: types.Profile) -> Result(String, AIError) {
  let system = "You are a strength coach. Give general exercise form advice."
  let prompt = "Experience: " <> profile.experience <> ", Place: " <> profile.place <> ", Goal: " <> profile.goal <> ". Give 3 general form tips for common exercises. Return ONLY a JSON array of strings, e.g. [\"tip1\", \"tip2\", \"tip3\"]. No markdown."

  case call_ai(system, prompt, 1024) {
    Ok(result_str) -> Ok(result_str)
    Error(e) -> Error(e)
  }
}

@external(erlang, "fitmentor_ws@planner_ffi", "today_iso_string")
fn erl_today_iso_string() -> String

fn today_str() -> String {
  erl_today_iso_string()
}
