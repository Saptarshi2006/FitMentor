import fitmentor_ws/jwt

pub fn database_url() -> String { jwt.env("DATABASE_URL") }

pub fn ai_worker_url() -> String { jwt.env("AI_WORKER_URL") }

pub fn api_shared_secret() -> String { jwt.env("API_SHARED_SECRET") }

pub fn redis_url() -> String {
  let u = jwt.env("REDIS_URL")
  case u {
    "" -> "redis://redis:6379"
    _ -> u
  }
}
