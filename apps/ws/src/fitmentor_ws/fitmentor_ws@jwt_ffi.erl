-module(fitmentor_ws@jwt_ffi).
-include_lib("public_key/include/public_key.hrl").
-export([urlsafe_b64_decode/1, rsa_verify/4, http_get/1, get_env/1, system_time_seconds/0]).

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
%% JWK values are big-endian unsigned integers, so decode to integers and
%% build a #'RSAPublicKey'{} record for public_key:verify/4 (crypto:rsa_verify
%% was removed in recent OTP).
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
%% Returns {ok, Body} | {error, Reason}.
http_get(Url) ->
  inets:start(),
  ssl:start(),
  case httpc:request(get, {Url, []}, [], [{body_format, binary}]) of
    {ok, {{_, 200, _}, _Headers, Body}} -> {ok, Body};
    {ok, {{_, Status, _}, _Headers, _}} -> {error, {status, Status}};
    {error, Reason} -> {error, Reason}
  end.
