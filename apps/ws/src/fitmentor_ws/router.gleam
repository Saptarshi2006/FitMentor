import fitmentor_ws/ws_handler
import gleam/bytes_tree
import gleam/http/request
import gleam/http/response
import mist

pub fn start() -> Result(Nil, Nil) {
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
        ["ws"] ->
          mist.websocket(
            request: req,
            on_init: ws_handler.on_init,
            on_close: ws_handler.on_close,
            handler: ws_handler.handle_message,
          )
        _ -> not_found
      }
    }
    |> mist.new
    |> mist.bind("0.0.0.0")
    |> mist.port(8080)
    |> mist.start

  Ok(Nil)
}
