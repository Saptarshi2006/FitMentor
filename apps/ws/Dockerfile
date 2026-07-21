FROM ghcr.io/gleam-lang/gleam:v1.17.0-erlang-alpine AS build

WORKDIR /app
COPY gleam.toml ./
COPY src ./src
RUN gleam build

FROM alpine:3.20

RUN apk add --no-cache libgcc libstdc++

COPY --from=build /app/build/erlang/release/fitmentor_ws/ /app/

EXPOSE 8080
CMD ["/app/bin/fitmentor_ws"]
