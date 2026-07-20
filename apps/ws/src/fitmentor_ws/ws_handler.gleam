import gleam/io
import gleam/list
import gleam/option.{None}
import gleam/string
import mist.{type WebsocketConnection, type WebsocketMessage}
import gleam/erlang/process

pub type WsState {
  WsState(
    user_id: String,
    conn: WebsocketConnection,
    subscriptions: List(String),
  )
}

pub type WsMessage {
  Broadcast(String)
}

pub fn on_init(
  conn: WebsocketConnection,
) -> #(WsState, option.Option(process.Selector(WsMessage))) {
  let state = WsState(user_id: "", conn: conn, subscriptions: [])
  #(state, None)
}

pub fn on_close(state: WsState) -> Nil {
  io.println("Client disconnected: " <> state.user_id)
  Nil
}

pub fn handle_message(
  state: WsState,
  message: WebsocketMessage(WsMessage),
  conn: WebsocketConnection,
) -> mist.Next(WsState, WsMessage) {
  case message {
    mist.Text(msg) -> handle_text(state, conn, msg)
    mist.Binary(_) -> mist.continue(state)
    mist.Closed | mist.Shutdown -> {
      io.println("Connection closed: " <> state.user_id)
      mist.stop()
    }
    mist.Custom(Broadcast(text)) -> {
      let _ = mist.send_text_frame(conn, text)
      mist.continue(state)
    }
  }
}

fn handle_text(
  state: WsState,
  conn: WebsocketConnection,
  msg: String,
) -> mist.Next(WsState, WsMessage) {
  let msg_type = extract_json_string(msg, "type")
  case msg_type {
    "ping" -> {
      let _ = mist.send_text_frame(conn, "{\"type\":\"pong\"}")
      mist.continue(state)
    }
    "subscribe" -> {
      let channels = extract_json_string_array(msg, "channels")
      let new_subs = list.append(state.subscriptions, channels)
      let new_state = WsState(..state, subscriptions: new_subs, conn: conn)
      let channel_list = string.join(channels, ",")
      let resp =
        "{\"type\":\"subscribed\",\"channels\":[\""
        <> channel_list
        <> "\"]}"
      let _ = mist.send_text_frame(conn, resp)
      io.println(
        "User " <> state.user_id <> " subscribed to: " <> channel_list,
      )
      mist.continue(new_state)
    }
    "unsubscribe" -> {
      let channels = extract_json_string_array(msg, "channels")
      let new_subs =
        list.filter(state.subscriptions, fn(s) {
          !list.contains(channels, s)
        })
      let new_state = WsState(..state, subscriptions: new_subs, conn: conn)
      let resp = "{\"type\":\"unsubscribed\"}"
      let _ = mist.send_text_frame(conn, resp)
      mist.continue(new_state)
    }
    "presence" -> {
      let status = extract_json_string(msg, "status")
      io.println("User " <> state.user_id <> " presence: " <> status)
      mist.continue(state)
    }
    _ -> {
      let resp =
        "{\"type\":\"error\",\"code\":\"invalid_message\",\"message\":\"Unknown message type\"}"
      let _ = mist.send_text_frame(conn, resp)
      mist.continue(state)
    }
  }
}

/// Extract a string value from a flat JSON object: {"key":"value"}
/// Ponytail: works for our 4 flat message types, no nesting needed.
fn extract_json_string(json: String, key: String) -> String {
  let needle = "\"" <> key <> "\":\""
  case string.split(json, needle) {
    [_, rest, ..] -> {
      case string.split(rest, "\"") {
        [value, ..] -> value
        [] -> ""
      }
    }
    _ -> ""
  }
}

/// Extract a string array from JSON: {"channels":["a","b"]}
fn extract_json_string_array(json: String, key: String) -> List(String) {
  let needle = "\"" <> key <> "\":["
  case string.split(json, needle) {
    [_, rest, ..] -> {
      case string.split(rest, "]") {
        [arr_content, ..] -> {
          string.split(arr_content, ",")
          |> list.map(fn(item) {
            string.replace(item, "\"", "")
            |> string.trim
          })
          |> list.filter(fn(s) { string.length(s) > 0 })
        }
        [] -> []
      }
    }
    _ -> []
  }
}
