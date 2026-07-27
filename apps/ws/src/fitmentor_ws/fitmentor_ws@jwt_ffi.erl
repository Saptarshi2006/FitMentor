-module(fitmentor_ws@jwt_ffi).
-include_lib("public_key/include/public_key.hrl").
-export([urlsafe_b64_decode/1, rsa_verify/4, http_get/1, http_post/3, get_env/1, system_time_seconds/0, throttle_init/0, throttle_check/3, current_minute_bucket/0]).

%% Read an OS environment variable, returns empty string if unset.
get_env(Key) ->
  case os:getenv(Key) of
    false -> "";
    V -> V
  end.

%% Decode base64url without padding (JWT segments often omit '=').
%% Returns the raw binary, or <<>> if decoding fails.
urlsafe_b64_decode(Bin) when is_binary(Bin) ->
  Padding = case byte_size(Bin) rem 4 of
    2 -> <<Bin/binary, "==">>;
    3 -> <<Bin/binary, "=">>;
    0 -> Bin;
    _ -> Bin
  end,
  Norm = binary:replace(Padding, <<"-">>, <<"+">>, [global]),
  Norm2 = binary:replace(Norm, <<"_">>, <<"/">>, [global]),
  try base64:decode(Norm2) of
    Decoded when is_binary(Decoded) -> Decoded;
    {ok, Decoded} -> Decoded;
    _ -> <<>>
  catch
    _:_ -> <<>>
  end.

%% RS256 verification: Message (signed bytes), Signature (raw bytes),
%% N and E as base64url-encoded RSA modulus/exponent (JWK fields).
rsa_verify(Message, Signature, N, E) ->
  try
    Mod = binary:decode_unsigned(urlsafe_b64_decode(N)),
    Exp = binary:decode_unsigned(urlsafe_b64_decode(E)),
    PubKey = #'RSAPublicKey'{modulus = Mod, publicExponent = Exp},
    public_key:verify(Message, sha256, Signature, PubKey)
  catch
    _:_ -> false
  end.

%% Current unix time in seconds.
system_time_seconds() ->
  erlang:system_time(second).

%% Minimal blocking HTTP GET via httpc (inets must be started).
http_get(Url) ->
  inets:start(),
  ssl:start(),
  case httpc:request(get, {Url, []}, [], [{body_format, binary}]) of
    {ok, {{_, 200, _}, _Headers, Body}} -> {ok, Body};
    {ok, {{_, Status, _}, _Headers, _}} -> {error, {status, Status}};
    {error, Reason} -> {error, Reason}
  end.

%% Blocking HTTP POST. Headers is a list of 2-tuples [{Key, Value}].
%% Returns {ok, {StatusCode, Body}} | {error, Reason}.
http_post(Url, Body, Headers) ->
  inets:start(),
  ssl:start(),
  AllHeaders = [{"content-type", "application/json"} | Headers],
  case httpc:request(post, {Url, AllHeaders, "application/json", Body},
                     [{timeout, 60000}], [{body_format, binary}]) of
    {ok, {{_, Status, _}, _RespHeaders, RespBody}} ->
      {ok, {Status, RespBody}};
    {error, Reason} ->
      {error, Reason}
  end.

%% ETS throttle table — in-memory rate limiting per user per minute
throttle_init() ->
  try
    case ets:info(fitmentor_throttle) of
      undefined -> ets:new(fitmentor_throttle, [public, named_table, set, write_concurrency, {read_concurrency, true}]);
      _ -> ok
    end
  catch
    _:_ -> ok
  end.

%% Current unix time in minutes (throttle bucket key).
current_minute_bucket() ->
  erlang:system_time(second) div 60.

%% Check throttle: returns 1 if under limit, 0 if exceeded.
%% Limit = max requests per minute for this user's tier.
throttle_check(UserId, MinuteBucket, Limit) ->
  Key = {UserId, MinuteBucket},
  case ets:lookup(fitmentor_throttle, Key) of
    [{_, Count}] ->
      NewCount = Count + 1,
      ets:insert(fitmentor_throttle, {Key, NewCount}),
      case NewCount > Limit of
        true -> 0;
        false -> 1
      end;
    [] ->
      ets:insert(fitmentor_throttle, {Key, 1}),
      1
  end.
