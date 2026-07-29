import fitmentor_ws/jwt
import fitmentor_ws/router
import gleam/erlang/process
import gleam/io
import gleam/otp/actor
import logging
import pog

pub fn main() {
  logging.configure()
  logging.set_level(logging.Info)

  io.println("FitMentor WS starting on port 8080")

  let pool_name = process.new_name("pg_pool")
  let db_url = jwt.env("DATABASE_URL")

  let conn = case db_url {
    "" -> {
      io.println("FATAL: DATABASE_URL not set")
      process.sleep_forever()
      // never reached but satisfies type checker
      panic as "DATABASE_URL not set"
    }
    url -> {
      let assert Ok(config) = pog.url_config(pool_name, url)
      let config = config |> pog.pool_size(5)
      let assert Ok(actor.Started(_, db_conn)) = pog.start(config)
      db_conn
    }
  }

  let _ = router.start(conn)

  process.sleep_forever()
}
