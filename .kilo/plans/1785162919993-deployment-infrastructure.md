# FitMentor Deployment Infrastructure Plan

## Overview

FitMentor is a full-stack fitness tracking application with two main deployment targets:

| Service | Tech | Deployment Target |
|---|---|---|
| Frontend (web) | TanStack Start + React, TypeScript | Cloudflare Pages via wrangler |
| Backend API | Rust (Axum), PostgreSQL/Redis | AWS EC2 (ap-south-2) via SSH |
| Daily Planner | Python (FastAPI) | AWS EC2 (same instance, batch or HTTP) |
| Ingest | Python (FastAPI) | AWS EC2 (same instance) |

## Architecture

- Frontend served as static assets on Cloudflare Pages, built via `vite build` with nitro/cloudflare-pages preset.
- Frontend server functions (TanStack Start) run on Cloudflare Workers at build time; browser-side code is static JS.
- Frontend server functions proxy API requests to the backend via `API_URL` (uses a fixed IP via sslip.io for security — hides the actual EC2 endpoint).
- Backend API is a Rust/Axum server on AWS EC2 ap-south-2, connecting to RDS PostgreSQL and ElastiCache Redis.
- Daily planner runs on the same EC2 instance, using Cloudflare AI for meal/workout plan generation with quota tracking in Redis.
- Ingest service runs on the same EC2 instance, ingesting content into Supermemory API with storage quotas in Redis.

## Deployment Workflow

### Frontend (Cloudflare Pages)

1. Build: `npm run build` in `apps/web/` (runs vite build + nitro prerender)
2. Deploy: `wrangler pages deploy dist --project-name fitmentor`
3. Credentials and state: `~/.wrangler/` contains KV namespace metadata, cache, and workflow state.
4. KV bindings: `fitmentor_sessions` (ID: `712dbd1cf4c64aa5a09700f783b041b9`) for session storage.
5. Wrangler config: `apps/web/wrangler.toml` defines KV namespace and AI binding.
6. Environment variables set in Cloudflare Pages dashboard (not in repo): `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `SESSION_SECRET`, `APP_URL`, `API_SHARED_SECRET`, `API_URL`.
7. The `API_URL` env var in Cloudflare Points to the EC2 instance's sslip.io address for server-to-server proxy calls from the browser.

### Backend (AWS EC2 ap-south-2)

1. Build: Rust release binary via Docker (`apps/api/Dockerfile` uses `rust:1.89-slim` builder).
2. Deploy: Copy Docker image or binary to EC2 instance via SSH, then restart the service.
3. Credentials: `~/.aws/` contains AWS CLI credentials for SSH access to EC2.
4. Infrastructure:
   - RDS PostgreSQL instance in ap-south-2 (endpoint in `DATABASE_URL`)
   - ElastiCache Redis (endpoint in `REDIS_URL`)
   - EC2 instance running the Rust API binary
5. Environment variables (from `docker-compose.prod.yml`):
   - `DATABASE_URL` → RDS endpoint in ap-south-2
   - `REDIS_URL` → ElastiCache endpoint
   - `CF_ACCOUNT_ID`, `CF_API_TOKEN` → for Cloudflare AI calls (used by daily planner)
   - `API_SHARED_SECRET` → shared key for server-to-server auth
   - `SESSION_SECRET` → for signing session cookies
   - `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` → OAuth
   - `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET` → payments
6. The Rust API exposes PostgreSQL and Redis connections, plus HTTP routes on port 3000.
7. Auth: JWT validation for API requests, session cookie auth for browser requests, API key auth for server-to-server calls.

### Daily Planner & Ingest Services

Both run on the same EC2 instance as the backend API.

1. Daily Planner: `microservices/daily-planner/` — Python FastAPI, runs in `batch` mode (scheduled) or `http` mode (on demand). Uses Cloudflare AI for generation, Redis for quota tracking, PostgreSQL for plan storage.
2. Ingest Service: `apps/ingest-python/` — Python FastAPI, ingests content into Supermemory API, tracks storage quotas in Redis.
3. Both are built from their respective Dockerfiles and deployed alongside the backend API.

## Key Files

- `apps/web/wrangler.toml` — Cloudflare Pages config, KV/AI bindings
- `apps/web/.wrangler/state/v3/` — Local wrangler state (KV, cache, workflows)
- `apps/web/dist/` — Built frontend assets
- `apps/api/src/` — Rust Axum server source
- `apps/ws/` — Gleam WebSocket service (not currently deployed via Fly.io)
- `microservices/daily-planner/` — Python daily planner
- `apps/ingest-python/` — Python ingest service
- `docker-compose.yml` — Dev Docker Compose (local Redis, API, WS, ingest, planner, TigerBeetle)
- `docker-compose.prod.yml` — Production Docker Compose (RDS, Cloudflare env vars)

## Credential Locations

- `~/.wrangler/` — Cloudflare wrangler state (KV, cache data, session metadata, workflows)
- `~/.aws/` — AWS credentials for EC2 SSH access (RDS, ElastiCache, EC2)

## Open Issues / Risks

1. **React error #31 (Invalid Hook Call) in production**: `index-D4xrrhOK.js` throws Minified React error #31. Root cause: `apps/web/package.json` has duplicate `graphql` entries (line 59: `^16.14.2`, line 84: `^16.9.0`) and duplicate `graphql-request` entries (line 60: `^7.4.0`, line 83: `^7.1.0`). These conflicting versions cause npm to install mismatched copies, which can lead to duplicate React instances in the Cloudflare Workers production bundle. **Fix**: Remove the duplicate entries on lines 83-84 of `apps/web/package.json`.
2. **API_URL uses sslip.io fixed IP**: Frontend proxies through the production `API_URL` env var for security (hides actual EC2 IP). This IP must remain mapped to the EC2 instance. If the EC2 instance changes, this IP mapping breaks.
3. **No CI/CD pipeline**: Deployment is manual. No GitHub Actions workflows exist in `.github/`.
4. **WebSocket service**: Gleam WebSocket service exists (`apps/ws/`) but has no active deployment target referenced. Previously configured for Fly.io (`fly.toml`), which is not used. Needs a deployment target (AWS EC2 or other).
5. **Daily planner Cloudflare AI dependency**: The planner uses `CF_ACCOUNT_ID` and `CF_API_TOKEN` stored on the EC2 instance, creating a dependency on Cloudflare credentials being present on AWS.
6. **All services on one EC2 instance**: Backend API, daily planner, and ingest all share the same EC2 instance. Resource contention could be an issue at scale.