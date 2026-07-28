-module(fitmentor_ws@community_db_ffi).
-export([connect/1, query/3, close/1, row_field/2, row_count/1]).

%% ponytail: minimal PostgreSQL v3.0 wire-protocol client.
%% Handles simple queries only (SELECT/INSERT/UPDATE/DELETE).
%% Upgrade path: epgsql library via Hex.

connect(DatabaseUrl) ->
    case parse_url(DatabaseUrl) of
        {error, E} -> {error, E};
        {ok, #{host := Host, port := Port, user := User, password := Pass, dbname := Db}} ->
            Opts = [binary, {packet, raw}, {active, false}, {keepalive, true}],
            case gen_tcp:connect(Host, Port, Opts, 10000) of
                {ok, Sock} ->
                    startup(Sock, User, Db),
                    case authenticate(Sock, Pass) of
                        ok -> {ok, Sock};
                        {error, E2} -> gen_tcp:close(Sock), {error, E2}
                    end;
                {error, E2} -> {error, E2}
            end
    end.

query(Sock, Sql, Params) when is_binary(Sql) ->
    case Params of
        [] ->
            BinSql = Sql,
            gen_tcp:send(Sock, <<$Q, (byte_size(BinSql) + 4):32/unsigned, BinSql/binary, 0>>);
        _ ->
            EncodedParams = [encode_param(P) || P <- Params],
            Portal = <<>>,
            Encoded = list_to_binary(EncodedParams),
            Len = byte_size(Portal) + byte_size(Sql) + 8 + byte_size(Encoded) + 2,
            Msg = <<$P, Len:32/unsigned, Portal/binary, 0,
                    Sql/binary, 0,
                    (length(Params)):16/unsigned, Encoded/binary>>,
            gen_tcp:send(Sock, Msg)
    end,
    collect_results(Sock, []);
query(_Sock, _Sql, _Params) ->
    {error, invalid_query}.

close(Sock) -> gen_tcp:close(Sock).

row_field(Row, Key) when is_map(Row), is_binary(Key) ->
    case maps:find(Key, Row) of
        {ok, null} -> <<>>;
        {ok, V} when is_binary(V) -> V;
        {ok, V} when is_list(V) -> list_to_binary(V);
        {ok, V} when is_integer(V) -> integer_to_binary(V);
        {ok, V} when is_float(V) -> float_to_binary(V, [{decimals, 2}]);
        {ok, true} -> <<"true">>;
        {ok, false} -> <<"false">>;
        error -> <<>>;
        _ -> <<>>
    end;
row_field(_, _) -> <<>>.

row_count(Rows) when is_list(Rows) -> length(Rows);
row_count(_) -> 0.

%% ── URL parsing ────────────────────────────────────────────────────

parse_url(Url) when is_binary(Url) ->
    parse_url(binary_to_list(Url));
parse_url(Url) ->
    Stripped = case lists:prefix("postgresql://", Url) of
        true -> lists:nthtail(13, Url);
        false ->
            case lists:prefix("postgres://", Url) of
                true -> lists:nthtail(11, Url);
                false -> Url
            end
    end,
    case string:find(Stripped, "@", trailing) of
        nomatch ->
            parse_host_port(Stripped, "", "");
        _ ->
            Idx = length(Stripped) - length(string:find(Stripped, "@", trailing)),
            UserPass = lists:sublist(Stripped, Idx),
            Rest = lists:nthtail(Idx + 1, Stripped),
            case string:find(UserPass, ":", leading) of
                nomatch ->
                    parse_host_port(Rest, UserPass, "");
                _ ->
                    CIdx = length(UserPass) - length(string:find(UserPass, ":", leading)),
                    User = lists:sublist(UserPass, CIdx),
                    Pass = lists:nthtail(CIdx + 1, UserPass),
                    parse_host_port(Rest, User, Pass)
            end
    end.

parse_host_port(Rest, User, Pass) ->
    case string:find(Rest, "/", leading) of
        nomatch ->
            {ok, #{host => Rest, port => 5432, user => User, password => Pass, dbname => ""}};
        _ ->
            Idx = length(Rest) - length(string:find(Rest, "/", leading)),
            HostPort = lists:sublist(Rest, Idx),
            DbRaw = lists:nthtail(Idx + 1, Rest),
            Db = case string:find(DbRaw, "?") of
                nomatch -> DbRaw;
                _ ->
                    QIdx = length(DbRaw) - length(string:find(DbRaw, "?")),
                    lists:sublist(DbRaw, QIdx)
            end,
            {Host, Port} = case string:find(HostPort, ":", leading) of
                nomatch -> {HostPort, 5432};
                _ ->
                    CIdx = length(HostPort) - length(string:find(HostPort, ":", leading)),
                    H = lists:sublist(HostPort, CIdx),
                    PStr = lists:nthtail(CIdx + 1, HostPort),
                    try list_to_integer(PStr) of
                        P -> {H, P}
                    catch _:_ -> {HostPort, 5432}
                    end
            end,
            {ok, #{host => Host, port => Port, user => User, password => Pass, dbname => Db}}
    end.

%% ── PostgreSQL wire protocol ───────────────────────────────────────

startup(Sock, User, Db) ->
    UserBin = list_to_binary(User),
    DbBin = list_to_binary(Db),
    Body = <<3, 0, 0, 0,
             0, "user", 0, UserBin/binary, 0,
             0, "database", 0, DbBin/binary, 0,
             0>>,
    Len = byte_size(Body) + 4,
    gen_tcp:send(Sock, <<Len:32/unsigned, Body/binary>>).

authenticate(Sock, Pass) ->
    case recv_msg(Sock) of
        {error, E} -> {error, E};
        {ok, <<"R", _:32/unsigned, 0, _/binary>>} -> ok;
        {ok, <<"R", _:32/unsigned, 3, SaltBin/binary>>} ->
            Md5 = md5_hash(Pass, binary_to_list(SaltBin)),
            send_password(Sock, Md5),
            case recv_msg(Sock) of
                {ok, <<"R", _:32/unsigned, 0, _/binary>>} -> ok;
                _ -> {error, auth_failed}
            end;
        {ok, <<"R", _:32/unsigned, 5, _/binary>>} ->
            PassBin = list_to_binary(Pass),
            send_password(Sock, PassBin),
            case recv_msg(Sock) of
                {ok, <<"R", _:32/unsigned, 0, _/binary>>} -> ok;
                _ -> {error, auth_failed}
            end;
        _ -> {error, auth_failed}
    end.

send_password(Sock, PassBin) ->
    Body = <<$p, (byte_size(PassBin) + 5):32/unsigned, PassBin/binary, 0>>,
    gen_tcp:send(Sock, Body).

md5_hash(Pass, Salt) ->
    Bin = list_to_binary(Pass),
    SaltBin = list_to_binary(Salt),
    S1 = binary_to_hex(crypto:hash(md5, <<Bin/binary, SaltBin/binary>>)),
    S2 = binary_to_hex(crypto:hash(md5, <<S1/binary, Bin/binary>>)),
    <<"md5", S2/binary>>.

binary_to_hex(Bin) ->
    << <<(hex_char(N))>> || <<N:4>> <= Bin >>.

hex_char(N) when N < 10 -> $0 + N;
hex_char(N) -> $a + N - 10.

encode_param(null) -> <<0, 0, 0, 0, -1:32/signed>>;
encode_param(V) when is_binary(V) -> <<0, 0, 0, 0, (byte_size(V)):32/signed, V/binary>>;
encode_param(V) when is_list(V) ->
    B = list_to_binary(V),
    <<0, 0, 0, 0, (byte_size(B)):32/signed, B/binary>>;
encode_param(V) when is_integer(V) -> <<0, 0, 0, 0, 8:32/signed, V:64/signed>>;
encode_param(V) when is_float(V) -> <<0, 0, 0, 0, 8:32/signed, V:64/float>>;
encode_param(true) -> <<0, 0, 0, 0, 1:32/signed, 1:8>>;
encode_param(false) -> <<0, 0, 0, 0, 1:32/signed, 0:8>>;
encode_param(_) -> <<0, 0, 0, 0, -1:32/signed>>.

collect_results(Sock, Acc) ->
    case recv_msg(Sock) of
        {error, E} ->
            case Acc of
                [] -> {error, E};
                _ -> {ok, lists:reverse(Acc)}
            end;
        {ok, <<"T", _:32/unsigned, Rest/binary>>} ->
            NumFields = binary:decode_unsigned(binary:part(Rest, 0, 2), big),
            FieldDefs = parse_fields(Rest, 2, NumFields, []),
            recv_data_rows(Sock, FieldDefs, Acc);
        {ok, <<"I", _:32/unsigned>>} -> {ok, lists:reverse(Acc)};
        {ok, <<"C", _:32/unsigned, _/binary>>} -> {ok, lists:reverse(Acc)};
        {ok, <<"Z", _:32/unsigned, _/binary>>} -> {ok, lists:reverse(Acc)};
        {ok, <<"E", _:32/unsigned, _Fields/binary>>} -> {error, pg_error};
        {ok, <<"N", _:32/unsigned, _/binary>>} -> collect_results(Sock, Acc);
        {ok, _Other} -> collect_results(Sock, Acc)
    end.

recv_data_rows(Sock, FieldDefs, Acc) ->
    case recv_msg(Sock) of
        {error, E} ->
            case Acc of
                [] -> {error, E};
                _ -> {ok, lists:reverse(Acc)}
            end;
        {ok, <<"D", _:32/unsigned, Data/binary>>} ->
            Row = parse_data_row(Data, FieldDefs, []),
            recv_data_rows(Sock, FieldDefs, [Row | Acc]);
        {ok, <<"C", _:32/unsigned, _/binary>>} -> {ok, lists:reverse(Acc)};
        {ok, <<"Z", _:32/unsigned, _/binary>>} -> {ok, lists:reverse(Acc)};
        {ok, <<"I", _:32/unsigned>>} -> {ok, lists:reverse(Acc)};
        {ok, <<"E", _:32/unsigned, _/binary>>} -> {error, pg_error};
        {ok, <<"N", _:32/unsigned, _/binary>>} -> recv_data_rows(Sock, FieldDefs, Acc);
        {ok, _Other} -> recv_data_rows(Sock, FieldDefs, Acc)
    end.

parse_fields(<<>>, _Off, 0, Acc) -> lists:reverse(Acc);
parse_fields(_Bin, _Off, 0, Acc) -> lists:reverse(Acc);
parse_fields(Bin, Off, _N, Acc) when Off >= byte_size(Bin) -> lists:reverse(Acc);
parse_fields(Bin, Off, N, Acc) ->
    {Name, AfterName} = read_cstring(Bin, Off),
    SkipOff = AfterName + 16,
    case SkipOff > byte_size(Bin) of
        true -> lists:reverse(Acc);
        false -> parse_fields(Bin, SkipOff, N - 1, [Name | Acc])
    end.

read_cstring(Bin, Off) ->
    case Bin of
        <<_:Off/binary, 0, _/binary>> ->
            Len = cstring_len(Bin, Off, 0),
            Name = binary_to_list(binary:part(Bin, Off, Len)),
            {Name, Off + Len + 1};
        _ -> {"", Off}
    end.

cstring_len(Bin, Off, Acc) ->
    case Bin of
        <<_:Off/binary, 0, _/binary>> -> Acc;
        <<_:Off/binary, _, _/binary>> -> cstring_len(Bin, Off + 1, Acc + 1);
        _ -> Acc
    end.

parse_data_row(<<_NumCols:16/unsigned, Rest/binary>>, FieldDefs, Acc) ->
    parse_cols(Rest, FieldDefs, Acc, 0).

parse_cols(<<>>, _FieldDefs, Acc, _Idx) ->
    maps:from_list(lists:reverse(Acc));
parse_cols(Bin, FieldDefs, Acc, Idx) ->
    case Bin of
        <<-1:32/signed, Rest/binary>> ->
            ColName = safe_field(FieldDefs, Idx),
            parse_cols(Rest, FieldDefs, [{ColName, null} | Acc], Idx + 1);
        <<Len:32/signed, Value:Len/binary, Rest/binary>> ->
            ColName = safe_field(FieldDefs, Idx),
            parse_cols(Rest, FieldDefs, [{ColName, Value} | Acc], Idx + 1);
        _ -> maps:from_list(lists:reverse(Acc))
    end.

safe_field(List, Idx) ->
    case lists:nthtail(Idx, List) of
        [H | _] -> H;
        [] -> "col_" ++ integer_to_list(Idx)
    end.

recv_msg(Sock) ->
    case gen_tcp:recv(Sock, 5, 30000) of
        {ok, <<Type:8, Len:32/unsigned>>} ->
            PayloadLen = Len - 4,
            case PayloadLen > 0 of
                true ->
                    case gen_tcp:recv(Sock, PayloadLen, 30000) of
                        {ok, Payload} -> {ok, <<Type:8, Len:32/unsigned, Payload/binary>>};
                        {error, E} -> {error, E}
                    end;
                false -> {ok, <<Type:8, Len:32/unsigned>>}
            end;
        {error, E} -> {error, E}
    end.
