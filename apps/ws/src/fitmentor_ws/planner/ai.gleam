import fitmentor_ws/jwt
import gleam/dynamic/decode
import gleam/http
import gleam/http/request
import gleam/httpc
import gleam/json
import gleam/string

pub type AIError {
  AIRequestFailed(String)
  AIDecodeFailed(String)
}

pub fn call_ai(
  system: String,
  prompt: String,
  max_tokens: Int,
) -> Result(String, AIError) {
  let url = jwt.env("AI_WORKER_URL")
  let secret = jwt.env("API_SHARED_SECRET")
  let body =
    json.object([
      #("system", json.string(system)),
      #("prompt", json.string(prompt)),
      #("max_tokens", json.int(max_tokens)),
    ])
    |> json.to_string

  case request.to(url) {
    Error(_) -> Error(AIRequestFailed("failed to create request"))
    Ok(base_req) -> {
      let req = base_req
        |> request.set_method(http.Post)
        |> request.set_body(body)
        |> request.prepend_header("x-api-key", secret)
        |> request.prepend_header("content-type", "application/json")

      case httpc.send(req) {
        Error(e) -> Error(AIRequestFailed(string.inspect(e)))
        Ok(resp) -> {
          let decoder = decode.field("result", decode.string, decode.success)

          case json.parse(resp.body, decoder) {
            Ok(result_str) -> Ok(result_str)
            Error(e) -> Error(AIDecodeFailed(string.inspect(e)))
          }
        }
      }
    }
  }
}
