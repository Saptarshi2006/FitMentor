import fitmentor_ws/ingest
import fitmentor_ws/jwt
import fitmentor_ws/ws_handler
import gleam/bit_array
import gleam/bytes_tree
import gleam/http
import gleam/http/request
import gleam/http/response
import gleam/list
import mist

pub fn start() -> Result(Nil, Nil) {
  jwt.throttle_init()
  let not_found =
    response.new(404)
    |> response.set_body(mist.Bytes(bytes_tree.new()))

  let assert Ok(_) =
    fn(req) {
      case request.path_segments(req) {
        ["health"] ->
          response.new(200)
          |> response.set_body(mist.Bytes(bytes_tree.from_string(
            "{\"status\":\"ok\",\"version\":\"1.0.0\"}",
          )))
        ["ws"] -> {
          let token = case request.get_query(req) {
            Ok(params) ->
              case list.key_find(params, "token") {
                Ok(t) -> t
                Error(_) -> ""
              }
            Error(_) -> ""
          }
          mist.websocket(
            request: req,
            on_init: ws_handler.on_init(_, token),
            on_close: ws_handler.on_close,
            handler: ws_handler.handle_message,
          )
        }
        ["v1", "ingest"] -> {
          case req.method {
            http.Post ->
              case mist.read_body(req, 1_000_000) {
                Ok(req_body) -> {
                  let body_str = case bit_array.to_string(req_body.body) {
                    Ok(s) -> s
                    Error(_) -> ""
                  }
                  let result = ingest.handle(body_str)
                  response.new(200)
                  |> response.set_header(
                    "content-type",
                    "application/json",
                  )
                  |> response.set_body(mist.Bytes(
                    bytes_tree.from_string(result),
                  ))
                }
                Error(_) ->
                  response.new(400)
                  |> response.set_header(
                    "content-type",
                    "application/json",
                  )
                  |> response.set_body(mist.Bytes(
                    bytes_tree.from_string(
                      "{\"ok\":false,\"error\":\"invalid body\"}",
                    ),
                  ))
              }
            _ -> not_found
          }
        }
        _ -> not_found
      }
    }
    |> mist.new
    |> mist.bind("0.0.0.0")
    |> mist.port(8080)
    |> mist.start

  Ok(Nil)
}
