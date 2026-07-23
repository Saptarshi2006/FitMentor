# FitMentor Epics & Stories

> Last updated: 2026-07-20
> Format: Each story maps 1:1 to a GitHub Issue

---

## Epic 1: Monorepo Setup

**Goal:** Restructure project into npm workspaces monorepo.

### Story 1.1: Create workspace root
- **Description:** Create root `package.json` with npm workspaces configuration. Move existing app to `apps/web/`.
- **Acceptance Criteria:**
  - [ ] Root `package.json` has `workspaces: ["apps/*", "packages/*"]`
  - [ ] Existing Vite+React app moved to `apps/web/`
  - [ ] `npm install` works from root
  - [ ] `npm run dev` works from `apps/web/`
- **Labels:** `epic:monorepo`, `priority:high`, `status:todo`

### Story 1.2: Create shared package
- **Description:** Create `packages/shared/` with types, utils, and constants extracted from `src/lib/`.
- **Acceptance Criteria:**
  - [ ] `packages/shared/package.json` with name `@fitmentor/shared`
  - [ ] Types extracted: Profile, DailyLog, WorkoutDay, Exercise, etc.
  - [ ] Utils extracted: calcBmr, calcTdee, calcTargets, computeStreak, etc.
  - [ ] Constants extracted: GOAL_LABEL, HEALTH_OPTIONS, EXERCISE_LIBRARY, etc.
  - [ ] `apps/web/` imports from `@fitmentor/shared` successfully
- **Labels:** `epic:monorepo`, `priority:high`, `status:todo`

### Story 1.3: Update imports in web app
- **Description:** Update all imports in `apps/web/` to use `@fitmentor/shared` instead of local `lib/` files.
- **Acceptance Criteria:**
  - [ ] No direct imports from `lib/` in `apps/web/src/`
  - [ ] All imports use `@fitmentor/shared`
  - [ ] App builds and runs without errors
- **Labels:** `epic:monorepo`, `priority:medium`, `status:todo`

---

## Epic 2: React Native App

**Goal:** Create bare React Native app with core screens.

### Story 2.1: Initialize React Native project
- **Description:** Create bare React Native app in `apps/mobile/` using `@react-native-community/cli`.
- **Acceptance Criteria:**
  - [ ] `apps/mobile/` exists with `package.json`, `android/`, `ios/`, `src/`
  - [ ] App builds and runs on iOS simulator
  - [ ] App builds and runs on Android emulator
  - [ ] Basic "Hello World" screen displays
- **Labels:** `epic:react-native`, `priority:high`, `status:todo`

### Story 2.2: Set up React Navigation
- **Description:** Install and configure React Navigation with bottom tabs and stack navigators.
- **Acceptance Criteria:**
  - [ ] Bottom tab navigator with 6 tabs (Home, Train, Tools, Coach, Food, You)
  - [ ] Stack navigator for onboarding and exercise detail screens
  - [ ] Tab icons using `react-native-vector-icons` or similar
  - [ ] Navigation works without crashes
- **Labels:** `epic:react-native`, `priority:high`, `status:todo`

### Story 2.3: Migrate onboarding screen
- **Description:** Convert the web onboarding flow to React Native components.
- **Acceptance Criteria:**
  - [ ] All 9 onboarding steps work
  - [ ] Profile saved to AsyncStorage
  - [ ] Navigation to home after completion
  - [ ] Form inputs work (text, slider, multi-select)
- **Labels:** `epic:react-native`, `priority:high`, `status:todo`

### Story 2.4: Migrate home screen
- **Description:** Convert the web home dashboard to React Native.
- **Acceptance Criteria:**
  - [ ] Daily greeting with user name
  - [ ] Today's session card
  - [ ] Streak + stats row
  - [ ] Daily habits (water, protein, workout)
  - [ ] Quick actions (Ask Coach, Progress)
- **Labels:** `epic:react-native`, `priority:high`, `status:todo`

### Story 2.5: Migrate workouts screen
- **Description:** Convert workout plans and exercise library to React Native.
- **Acceptance Criteria:**
  - [ ] "This week" tab with expandable workout days
  - [ ] "Library" tab with exercise grid
  - [ ] Exercise detail screen
  - [ ] "Mark complete" functionality
- **Labels:** `epic:react-native`, `priority:medium`, `status:todo`

### Story 2.6: Migrate nutrition screen
- **Description:** Convert meal plans and protein tracking to React Native.
- **Acceptance Criteria:**
  - [ ] Daily target display with macro breakdown
  - [ ] Meal plans tab
  - [ ] Quick log tab with food items
  - [ ] Custom protein target slider
- **Labels:** `epic:react-native`, `priority:medium`, `status:todo`

### Story 2.7: Migrate coach screen
- **Description:** Convert AI coach chat interface to React Native.
- **Acceptance Criteria:**
  - [ ] Chat message list with user/assistant bubbles
- **Labels:** `epic:react-native`, `priority:medium`, `status:todo`
- **Acceptance Criteria (continued):**
  - [ ] Text input with send button
  - [ ] Loading indicator
  - [ ] Starter prompts
  - [ ] Markdown rendering for assistant responses
- **Labels:** `epic:react-native`, `priority:medium`, `status:todo`

### Story 2.8: Migrate progress screen
- **Description:** Convert progress tracking and charts to React Native.
- **Acceptance Criteria:**
  - [ ] Streak and workout count cards
  - [ ] Weight logging with line chart
  - [ ] Protein intake bar chart
  - [ ] PDF export (future)
- **Labels:** `epic:react-native`, `priority:medium`, `status:todo`

### Story 2.9: Migrate profile screen
- **Description:** Convert profile display and subscription UI to React Native.
- **Acceptance Criteria:**
  - [ ] User avatar and name
  - [ ] Subscription status (free/premium/pro)
  - [ ] Targets display
  - [ ] Stats display
  - [ ] Edit profile button
- **Labels:** `epic:react-native`, `priority:medium`, `status:todo`

### Story 2.10: Migrate tools screen
- **Description:** Convert AI tools (BMI, sleep, steps, etc.) to React Native.
- **Acceptance Criteria:**
  - [ ] Horizontal scrollable tool tabs
  - [ ] BMI calculator
  - [ ] Sleep tracker
  - [ ] Steps tracker
  - [ ] Injury assessment
  - [ ] Supplement guide
  - [ ] Calorie timeline
  - [ ] Community feed
- **Labels:** `epic:react-native`, `priority:low`, `status:todo`

---

## Epic 3: Web App (Landing + Dashboard)

**Goal:** Create landing page and basic dashboard for web.

### Story 3.1: Create landing page
- **Description:** Build a marketing landing page at `/` with hero, features, and CTA.
- **Acceptance Criteria:**
  - [ ] Hero section with app name, tagline, CTA button
  - [ ] Features section (3-4 key features)
  - [ ] How it works section
  - [ ] Footer with links
  - [ ] Responsive design
  - [ ] CTA links to `/dashboard` or `/onboarding`
- **Labels:** `epic:web-app`, `priority:high`, `status:todo`

### Story 3.2: Create dashboard layout
- **Description:** Create authenticated dashboard layout with sidebar/topbar.
- **Acceptance Criteria:**
  - [ ] Auth check (redirect to landing if not authenticated)
  - [ ] Sidebar/topbar with navigation
  - [ ] Main content area
  - [ ] Mobile responsive
- **Labels:** `epic:web-app`, `priority:high`, `status:todo`

### Story 3.3: Dashboard — daily habits
- **Description:** Show daily habits tracker on dashboard.
- **Acceptance Criteria:**
  - [ ] Water tracker with +1 button
  - [ ] Protein tracker with +20g button
  - [ ] Workout done toggle
  - [ ] Progress bars for each
- **Labels:** `epic:web-app`, `priority:high`, `status:todo`

### Story 3.4: Dashboard — AI coach chat
- **Description:** Embed AI coach chat in dashboard.
- **Acceptance Criteria:**
  - [ ] Chat interface in dashboard
  - [ ] Same functionality as mobile coach
  - [ ] Responsive layout
- **Labels:** `epic:web-app`, `priority:medium`, `status:todo`

### Story 3.5: Dashboard — profile view
- **Description:** Show user profile and targets on dashboard.
- **Acceptance Criteria:**
  - [ ] Profile summary (name, goal, stats)
  - [ ] Daily targets (calories, protein, carbs, fat)
  - [ ] Edit profile link
- **Labels:** `epic:web-app`, `priority:medium`, `status:todo`

---

## Epic 4: Backend Foundation

**Goal:** Set up Rust/Axum API with PostgreSQL and Redis.

### Story 4.1: Initialize Rust project
- **Description:** Create Rust project in `apps/api/` with Axum framework.
- **Acceptance Criteria:**
  - [ ] `apps/api/Cargo.toml` with axum, sqlx, redis, etc.
  - [ ] Basic health endpoint (`GET /v1/health`)
  - [ ] App builds and runs
- **Labels:** `epic:backend`, `priority:high`, `status:todo`

### Story 4.2: Database schema + migrations
- **Description:** Create PostgreSQL schema and SQLx migrations.
- **Acceptance Criteria:**
  - [ ] Migration files for users, profiles, subscriptions, daily_logs, workout_completions
  - [ ] Migrations run successfully
  - [ ] SQLx compile-time checks pass
- **Labels:** `epic:backend`, `priority:high`, `status:todo`

### Story 4.3: Auth middleware
- **Description:** Implement Cloudflare Access JWT validation.
- **Acceptance Criteria:**
  - [ ] JWT validation using JWKS
  - [ ] AuthUser extractor for protected routes
  - [ ] User auto-provisioning on first auth
- **Labels:** `epic:backend`, `priority:high`, `status:todo`

### Story 4.4: User & Profile endpoints
- **Description:** Implement user and profile CRUD endpoints.
- **Acceptance Criteria:**
  - [ ] `GET /v1/user/me` — get current user + profile
  - [ ] `PUT /v1/user/profile` — update profile
  - [ ] `PUT /v1/user/profile/protein-target` — custom protein target
- **Labels:** `epic:backend`, `priority:high`, `status:todo`

### Story 4.5: Daily Logs endpoints
- **Description:** Implement daily log CRUD endpoints.
- **Acceptance Criteria:**
  - [ ] `GET /v1/logs/today` — get today's log
  - [ ] `PUT /v1/logs/today` — update today's log
  - [ ] `GET /v1/logs?from=&to=` — get logs in date range
  - [ ] `GET /v1/logs/streak` — get current streak
- **Labels:** `epic:backend`, `priority:high`, `status:todo`

### Story 4.6: Redis caching layer
- **Description:** Add Redis caching for user data, daily logs, streaks.
- **Acceptance Criteria:**
  - [ ] Cache user profile (5min TTL)
  - [ ] Cache today's log (30s TTL)
  - [ ] Cache streak count (1min TTL)
  - [ ] Cache invalidation on writes
- **Labels:** `epic:backend`, `priority:medium`, `status:todo`

---

## Epic 5: WebSocket Layer

**Goal:** Set up Gleam/Mist WebSocket server with Redis Pub/Sub.

### Story 5.1: Initialize Gleam project
- **Description:** Create Gleam project in `apps/ws/` with Mist framework.
- **Acceptance Criteria:**
  - [ ] `apps/ws/gleam.toml` configured
  - [ ] Basic WebSocket endpoint
  - [ ] App builds and runs
- **Labels:** `epic:websocket`, `priority:high`, `status:todo`

### Story 5.2: JWT validation
- **Description:** Implement Cloudflare Access JWT validation in Gleam.
- **Acceptance Criteria:**
  - [ ] JWT validation on WebSocket upgrade
  - [ ] Reject unauthorized connections
- **Labels:** `epic:websocket`, `priority:high`, `status:todo`

### Story 5.3: Redis Pub/Sub integration
- **Description:** Subscribe to Redis Pub/Sub channels and broadcast to WebSocket clients.
- **Acceptance Criteria:**
  - [ ] Subscribe to `ws:broadcast:{user_id}` channel
  - [ ] Subscribe to `ws:community` channel
  - [ ] Broadcast messages to connected clients
- **Labels:** `epic:websocket`, `priority:high`, `status:todo`

### Story 5.4: Presence tracking
- **Description:** Track online users using Redis sets.
- **Acceptance Criteria:**
  - [ ] Add user to presence set on connect
  - [ ] Remove user on disconnect
  - [ ] Heartbeat to maintain presence
- **Labels:** `epic:websocket`, `priority:medium`, `status:todo`

---

## Epic 6: AI Coach

**Goal:** Implement AI coach with Supermemory and LLM streaming.

### Story 6.1: Coach chat endpoint
- **Description:** Implement `POST /v1/coach/chat` in Rust API.
- **Acceptance Criteria:**
  - [ ] Accept messages array + optional sessionId
  - [ ] Load user profile for context
  - [ ] Call LLM API with streaming
  - [ ] Return streaming response
- **Labels:** `epic:ai-coach`, `priority:high`, `status:todo`

### Story 6.2: Supermemory integration
- **Description:** Integrate Supermemory for RAG context.
- **Acceptance Criteria:**
  - [ ] Get user profile from Supermemory
  - [ ] Search relevant memories
  - [ ] Ingest conversation summary after chat
- **Labels:** `epic:ai-coach`, `priority:high`, `status:todo`

### Story 6.3: WebSocket streaming
- **Description:** Stream coach responses via WebSocket.
- **Acceptance Criteria:**
  - [ ] Rust publishes chunks to Redis
  - [ ] Gleam receives and forwards to WebSocket
  - [ ] Client receives streaming response
- **Labels:** `epic:ai-coach`, ** priority:medium**, `status:todo`

### Story 6.4: Conversation storage
- **Description:** Store coach conversations in MongoDB.
- **Acceptance Criteria:**
  - [ ] Save user and assistant messages
  - [ ] Load conversation history by sessionId
  - [ ] Paginate old conversations
- **Labels:** `epic:ai-coach`, `priority:medium`, `status:todo`

---

## Epic 7: Payments

**Goal:** Implement Polar.sh checkout and TigerBeetle ledger.

### Story 7.1: Polar.sh checkout
- **Description:** Implement subscription checkout flow.
- **Acceptance Criteria:**
  - [ ] `POST /v1/subscriptions/checkout` creates Polar checkout
  - [ ] Redirect to Polar hosted checkout
  - [ ] Success redirect to profile page
- **Labels:** `epic:payments`, `priority:high`, `status:todo`

### Story 7.2: Webhook handler
- **Description:** Handle Polar.sh webhooks for payment events.
- **Acceptance Criteria:**
  - [ ] Verify webhook signature
  - [ ] Handle order.paid, subscription.active, subscription.canceled
  - [ ] Update subscription in PostgreSQL
- **Labels:** `epic:payments`, `priority:high`, `status:todo`

### Story 7.3: TigerBeetle ledger
- **Description:** Record payments in TigerBeetle double-entry ledger.
- **Acceptance Criteria:**
  - [ ] Create accounts for users
  - [ ] Record transfers for payments
  - [ ] Query user balance
- **Labels:** `epic:payments`, `priority:medium`, `status:todo`

### Story 7.4: Subscription status sync
- **Description:** Sync subscription status via WebSocket.
- **Acceptance Criteria:**
  - [ ] Publish subscription_update on status change
  - [ ] Client receives real-time subscription update
  - [ ] UI reflects subscription tier
- **Labels:** `epic:payments`, `priority:medium`, `status:todo`

---

## Epic 8: Deploy

**Goal:** Set up CI/CD and production deployment.

### Story 8.1: Docker Compose for local dev
- **Description:** Create docker-compose.yml for local development.
- **Acceptance Criteria:**
  - [ ] Redis, PostgreSQL, MongoDB, TigerBeetle containers
  - [ ] API and WS containers
  - [ ] `docker compose up` works
- **Labels:** `epic:deploy`, `priority:high`, `status:todo`

### Story 8.2: Fly.io deployment
- **Description:** Deploy Rust API and Gleam WS to Fly.io.
- **Acceptance Criteria:**
  - [ ] fly.toml for API and WS
  - [ ] Apps deploy successfully
  - [ ] Health endpoints respond
- **Labels:** `epic:deploy`, `priority:high`, `status:todo`

### Story 8.3: Cloudflare Pages deployment
- **Description:** Deploy web app to Cloudflare Pages.
- **Acceptance Criteria:**
  - [ ] Build output deployed
  - [ ] Landing page accessible
  - [ ] Dashboard accessible (with auth)
- **Labels:** `epic:deploy`, `priority:high**, `status:todo`

### Story 8.4: GitHub Actions CI/CD
- **Description:** Set up CI/CD pipeline for automated deployments.
- **Acceptance Criteria:**
  - [ ] Build and test on PR
  - [ ] Deploy to Fly.io on main push
  - [ ] Deploy to Cloudflare Pages on main push
- **Labels:** `epic:deploy`, `priority:medium`, `status:todo`

---

## Story Map

```
Epic 1: Monorepo Setup ─────────────────────────┐
  1.1 Create workspace root                       │
  1.2 Create shared package                       │
  1.3 Update imports                              │
                                                  │
Epic 2: React Native App ────────────────────────┤
  2.1 Initialize RN project                       │
  2.2 Set up React Navigation                     │
  2.3 Migrate onboarding                          │
  2.4 Migrate home                                │
  2.5 Migrate workouts                            │
  2.6 Migrate nutrition                           │
  2.7 Migrate coach                               │
  2.8 Migrate progress                            │
  2.9 Migrate profile                             │
  2.10 Migrate tools                              │
                                                  │
Epic 3: Web App ─────────────────────────────────┤
  3.1 Create landing page                         │
  3.2 Create dashboard layout                     │
  3.3 Dashboard — daily habits                    │
  3.4 Dashboard — AI coach chat                   │
  3.5 Dashboard — profile view                    │
                                                  │
Epic 4: Backend Foundation ──────────────────────┤
  4.1 Initialize Rust project                     │
  4.2 Database schema + migrations                │
  4.3 Auth middleware                             │
  4.4 User & Profile endpoints                    │
  4.5 Daily Logs endpoints                        │
  4.6 Redis caching layer                         │
                                                  │
Epic 5: WebSocket Layer ─────────────────────────┤
  5.1 Initialize Gleam project                    │
  5.2 JWT validation                              │
  5.3 Redis Pub/Sub integration                   │
  5.4 Presence tracking                           │
                                                  │
Epic 6: AI Coach ────────────────────────────────┤
  6.1 Coach chat endpoint                         │
  6.2 Supermemory integration                     │
  6.3 WebSocket streaming                         │
  6.4 Conversation storage                        │
                                                  │
Epic 7: Payments ────────────────────────────────┤
  7.1 Polar.sh checkout                           │
  7.2 Webhook handler                             │
  7.3 TigerBeetle ledger                          │
  7.4 Subscription status sync                    │
                                                  │
Epic 8: Deploy ──────────────────────────────────┘
  8.1 Docker Compose for local dev
  8.2 Fly.io deployment
  8.3 Cloudflare Pages deployment
  8.4 GitHub Actions CI/CD
```

---

## Priority Legend

- **P0 (high):** Must have for MVP
- **P1 (medium):** Should have for launch
- **P2 (low):** Nice to have

## Status Legend

- `todo` — Not started
- `in_progress` — Being worked on
- `done` — Completed
- `blocked` — Waiting on dependency

---

*Each story maps 1:1 to a GitHub Issue. Use labels `epic:<name>` and `priority:<level>` for filtering.*
