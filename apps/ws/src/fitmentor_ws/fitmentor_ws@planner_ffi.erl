-module(fitmentor_ws@planner_ffi).
-export([today_iso_string/0]).

today_iso_string() ->
  {{Y,M,D}, _} = calendar:local_time(),
  list_to_binary(io_lib:format("~4..0B-~2..0B-~2..0B", [Y,M,D])).
