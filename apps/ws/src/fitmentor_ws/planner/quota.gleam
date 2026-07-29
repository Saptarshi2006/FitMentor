import fitmentor_ws/planner/config
import gleam/float
import gleam/int
import gleam/option.{None, Some}
import valkyrie.{ExpirySeconds, IfNotExists, default_set_options}

const total_ai_pool = 10_000

fn tier_multiplier(tier: String) -> Float {
  case tier {
    "premium" -> 2.0
    "pro" -> 1.4
    _ -> 1.0
  }
}

fn conn() -> Result(valkyrie.Connection, valkyrie.Error) {
  let config = case valkyrie.url_config(config.redis_url()) {
    Ok(c) -> c
    Error(_) -> valkyrie.default_config()
  }
  valkyrie.create_connection(config, 2000)
}

pub fn check_quota(cf_sub: String) -> Bool {
  case conn() {
    Error(_) -> True
    Ok(c) -> {
      let r = check_quota_inner(c, cf_sub)
      let _ = valkyrie.shutdown(c, 1000)
      r
    }
  }
}

fn check_quota_inner(c: valkyrie.Connection, cf_sub: String) -> Bool {
  let today = today_str()
  let tier = get_tier(c, cf_sub)
  let mult = tier_multiplier(tier)

  let seen_opts = Some(valkyrie.SetOptions(..default_set_options(),
    existence_condition: Some(IfNotExists),
    expiry_option: Some(ExpirySeconds(86400)),
  ))
  let _ = valkyrie.set(c, "quota:planner:seen:" <> cf_sub <> ":" <> today, "1", seen_opts, 2000)
  let _ = valkyrie.incr(c, "quota:planner:active:" <> tier, 2000)
  let _ = valkyrie.expire(c, "quota:planner:active:" <> tier, 86400, None, 2000)

  let free = redis_get_int(c, "quota:planner:active:free")
  let pro = redis_get_int(c, "quota:planner:active:pro")
  let premium = redis_get_int(c, "quota:planner:active:premium")

  let weighted =
    int.to_float(free) *. 1.0
    +. int.to_float(pro) *. 1.4
    +. int.to_float(premium) *. 2.0

  let user_limit = case weighted >. 0.0 {
    True -> float.truncate(int.to_float(total_ai_pool) *. mult /. weighted)
    False -> total_ai_pool
  }

  let user_key = "quota:planner:user:" <> cf_sub <> ":" <> today
  let used = redis_get_int(c, user_key)

  case used >= user_limit {
    True -> False
    False -> {
      let _ = valkyrie.incr(c, user_key, 2000)
      let _ = valkyrie.expire(c, user_key, 86400, None, 2000)
      True
    }
  }
}

fn get_tier(c: valkyrie.Connection, cf_sub: String) -> String {
  case valkyrie.get(c, "user:tier:" <> cf_sub, 2000) {
    Ok(v) -> v
    Error(_) -> "free"
  }
}

fn redis_get_int(c: valkyrie.Connection, key: String) -> Int {
  case valkyrie.get(c, key, 2000) {
    Ok(v) -> {
      case int.parse(v) {
        Ok(n) -> n
        Error(_) -> 0
      }
    }
    Error(_) -> 0
  }
}

@external(erlang, "fitmentor_ws@planner_ffi", "today_iso_string")
fn erl_today_iso_string() -> String

fn today_str() -> String {
  erl_today_iso_string()
}
