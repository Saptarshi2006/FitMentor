#!/bin/bash
# Create GitHub Issues from epics/stories.md
# Run from project root: bash openspec/specs/epics/create-issues.sh

set -e

echo "Creating labels..."

gh label create "epic:monorepo" --color "0E8A16" --description "Monorepo setup" --force
gh label create "epic:react-native" --color "1D76DB" --description "React Native app" --force
gh label create "epic:web-app" --color "D93F0B" --description "Web app (landing + dashboard)" --force
gh label create "epic:backend" --color "5319E7" --description "Rust/Axum backend" --force
gh label create "epic:websocket" --color "FBCA04" --description "Gleam/Mist WebSocket" --force
gh label create "epic:ai-coach" --color "0052CC" --description "AI coach with Supermemory" --force
gh label create "epic:payments" --color "E99695" --description "Polar.sh payments" --force
gh label create "epic:deploy" --color "C5DEF5" --description "Deployment & CI/CD" --force
gh label create "priority:high" --color "B60205" --description "Must have for MVP" --force
gh label create "priority:medium" --color "F9D0C4" --description "Should have for launch" --force
gh label create "priority:low" --color "0E8A16" --description "Nice to have" --force
gh label create "status:done" --color "0E8A16" --description "Completed" --force

echo ""
echo "Creating issues..."

# Epic 1: Monorepo Setup
gh issue create --title "[Monorepo] Create workspace root" --body "## Story 1.1

Create root \`package.json\` with npm workspaces configuration. Move existing app to \`apps/web/\`.

### Acceptance Criteria
- [ ] Root \`package.json\` has \`workspaces: [\"apps/*\", \"packages/*\"]\`
- [ ] Existing Vite+React app moved to \`apps/web/\`
- [ ] \`npm install\` works from root
- [ ] \`npm run dev\` works from \`apps/web/\`" --label "epic:monorepo,priority:high"

gh issue create --title "[Monorepo] Create shared package" --body "## Story 1.2

Create \`packages/shared/\` with types, utils, and constants extracted from \`src/lib/\`.

### Acceptance Criteria
- [ ] \`packages/shared/package.json\` with name \`@fitmentor/shared\`
- [ ] Types extracted: Profile, DailyLog, WorkoutDay, Exercise, etc.
- [ ] Utils extracted: calcBmr, calcTdee, calcTargets, computeStreak, etc.
- [ ] Constants extracted: GOAL_LABEL, HEALTH_OPTIONS, EXERCISE_LIBRARY, etc.
- [ ] \`apps/web/\` imports from \`@fitmentor/shared\` successfully" --label "epic:monorepo,priority:high"

gh issue create --title "[Monorepo] Update imports in web app" --body "## Story 1.3

Update all imports in \`apps/web/\` to use \`@fitmentor/shared\` instead of local \`lib/\` files.

### Acceptance Criteria
- [ ] No direct imports from \`lib/\` in \`apps/web/src/\`
- [ ] All imports use \`@fitmentor/shared\`
- [ ] App builds and runs without errors" --label "epic:monorepo,priority:medium"

# Epic 2: React Native App
gh issue create --title "[React Native] Initialize project" --body "## Story 2.1

Create bare React Native app in \`apps/mobile/\` using \`@react-native-community/cli\`.

### Acceptance Criteria
- [ ] \`apps/mobile/\` exists with \`package.json\`, \`android/\`, \`ios/\`, \`src/\`
- [ ] App builds and runs on iOS simulator
- [ ] App builds and runs on Android emulator
- [ ] Basic \"Hello World\" screen displays" --label "epic:react-native,priority:high"

gh issue create --title "[React Native] Set up React Navigation" --body "## Story 2.2

Install and configure React Navigation with bottom tabs and stack navigators.

### Acceptance Criteria
- [ ] Bottom tab navigator with 6 tabs (Home, Train, Tools, Coach, Food, You)
- [ ] Stack navigator for onboarding and exercise detail screens
- [ ] Tab icons using \`react-native-vector-icons\` or similar
- [ ] Navigation works without crashes" --label "epic:react-native,priority:high"

gh issue create --title "[React Native] Migrate onboarding screen" --body "## Story 2.3

Convert the web onboarding flow to React Native components.

### Acceptance Criteria
- [ ] All 9 onboarding steps work
- [ ] Profile saved to AsyncStorage
- [ ] Navigation to home after completion
- [ ] Form inputs work (text, slider, multi-select)" --label "epic:react-native,priority:high"

gh issue create --title "[React Native] Migrate home screen" --body "## Story 2.4

Convert the web home dashboard to React Native.

### Acceptance Criteria
- [ ] Daily greeting with user name
- [ ] Today's session card
- [ ] Streak + stats row
- [ ] Daily habits (water, protein, workout)
- [ ] Quick actions (Ask Coach, Progress)" --label "epic:react-native,priority:high"

gh issue create --title "[React Native] Migrate workouts screen" --body "## Story 2.5

Convert workout plans and exercise library to React Native.

### Acceptance Criteria
- [ ] \"This week\" tab with expandable workout days
- [ ] \"Library\" tab with exercise grid
- [ ] Exercise detail screen
- [ ] \"Mark complete\" functionality" --label "epic:react-native,priority:medium"

gh issue create --title "[React Native] Migrate nutrition screen" --body "## Story 2.6

Convert meal plans and protein tracking to React Native.

### Acceptance Criteria
- [ ] Daily target display with macro breakdown
- [ ] Meal plans tab
- [ ] Quick log tab with food items
- [ ] Custom protein target slider" --label "epic:react-native,priority:medium"

gh issue create --title "[React Native] Migrate coach screen" --body "## Story 2.7

Convert AI coach chat interface to React Native.

### Acceptance Criteria
- [ ] Chat message list with user/assistant bubbles
- [ ] Text input with send button
- [ ] Loading indicator
- [ ] Starter prompts
- [ ] Markdown rendering for assistant responses" --label "epic:react-native,priority:medium"

gh issue create --title "[React Native] Migrate progress screen" --body "## Story 2.8

Convert progress tracking and charts to React Native.

### Acceptance Criteria
- [ ] Streak and workout count cards
- [ ] Weight logging with line chart
- [ ] Protein intake bar chart
- [ ] PDF export (future)" --label "epic:react-native,priority:medium"

gh issue create --title "[React Native] Migrate profile screen" --body "## Story 2.9

Convert profile display and subscription UI to React Native.

### Acceptance Criteria
- [ ] User avatar and name
- [ ] Subscription status (free/premium/pro)
- [ ] Targets display
- [ ] Stats display
- [ ] Edit profile button" --label "epic:react-native,priority:medium"

gh issue create --title "[React Native] Migrate tools screen" --body "## Story 2.10

Convert AI tools (BMI, sleep, steps, etc.) to React Native.

### Acceptance Criteria
- [ ] Horizontal scrollable tool tabs
- [ ] BMI calculator
- [ ] Sleep tracker
- [ ] Steps tracker
- [ ] Injury assessment
- [ ] Supplement guide
- [ ] Calorie timeline
- [ ] Community feed" --label "epic:react-native,priority:low"

# Epic 3: Web App
gh issue create --title "[Web App] Create landing page" --body "## Story 3.1

Build a marketing landing page at \`/\` with hero, features, and CTA.

### Acceptance Criteria
- [ ] Hero section with app name, tagline, CTA button
- [ ] Features section (3-4 key features)
- [ ] How it works section
- [ ] Footer with links
- [ ] Responsive design
- [ ] CTA links to \`/dashboard\` or \`/onboarding\`" --label "epic:web-app,priority:high"

gh issue create --title "[Web App] Create dashboard layout" --body "## Story 3.2

Create authenticated dashboard layout with sidebar/topbar.

### Acceptance Criteria
- [ ] Auth check (redirect to landing if not authenticated)
- [ ] Sidebar/topbar with navigation
- [ ] Main content area
- [ ] Mobile responsive" --label "epic:web-app,priority:high"

gh issue create --title "[Web App] Dashboard — daily habits" --body "## Story 3.3

Show daily habits tracker on dashboard.

### Acceptance Criteria
- [ ] Water tracker with +1 button
- [ ] Protein tracker with +20g button
- [ ] Workout done toggle
- [ ] Progress bars for each" --label "epic:web-app,priority:high"

gh issue create --title "[Web App] Dashboard — AI coach chat" --body "## Story 3.4

Embed AI coach chat in dashboard.

### Acceptance Criteria
- [ ] Chat interface in dashboard
- [ ] Same functionality as mobile coach
- [ ] Responsive layout" --label "epic:web-app,priority:medium"

gh issue create --title "[Web App] Dashboard — profile view" --body "## Story 3.5

Show user profile and targets on dashboard.

### Acceptance Criteria
- [ ] Profile summary (name, goal, stats)
- [ ] Daily targets (calories, protein, carbs, fat)
- [ ] Edit profile link" --label "epic:web-app,priority:medium"

# Epic 4: Backend Foundation
gh issue create --title "[Backend] Initialize Rust project" --body "## Story 4.1

Create Rust project in \`apps/api/\` with Axum framework.

### Acceptance Criteria
- [ ] \`apps/api/Cargo.toml\` with axum, sqlx, redis, etc.
- [ ] Basic health endpoint (\`GET /v1/health\`)
- [ ] App builds and runs" --label "epic:backend,priority:high"

gh issue create --title "[Backend] Database schema + migrations" --body "## Story 4.2

Create PostgreSQL schema and SQLx migrations.

### Acceptance Criteria
- [ ] Migration files for users, profiles, subscriptions, daily_logs, workout_completions
- [ ] Migrations run successfully
- [ ] SQLx compile-time checks pass" --label "epic:backend,priority:high"

gh issue create --title "[Backend] Auth middleware" --body "## Story 4.3

Implement Cloudflare Access JWT validation.

### Acceptance Criteria
- [ ] JWT validation using JWKS
- [ ] AuthUser extractor for protected routes
- [ ] User auto-provisioning on first auth" --label "epic:backend,priority:high"

gh issue create --title "[Backend] User & Profile endpoints" --body "## Story 4.4

Implement user and profile CRUD endpoints.

### Acceptance Criteria
- [ ] \`GET /v1/user/me\` — get current user + profile
- [ ] \`PUT /v1/user/profile\` — update profile
- [ ] \`PUT /v1/user/profile/protein-target\` — custom protein target" --label "epic:backend,priority:high"

gh issue create --title "[Backend] Daily Logs endpoints" --body "## Story 4.5

Implement daily log CRUD endpoints.

### Acceptance Criteria
- [ ] \`GET /v1/logs/today\` — get today's log
- [ ] \`PUT /v1/logs/today\` — update today's log
- [ ] \`GET /v1/logs?from=&to=\` — get logs in date range
- [ ] \`GET /v1/logs/streak\` — get current streak" --label "epic:backend,priority:high"

gh issue create --title "[Backend] Redis caching layer" --body "## Story 4.6

Add Redis caching for user data, daily logs, streaks.

### Acceptance Criteria
- [ ] Cache user profile (5min TTL)
- [ ] Cache today's log (30s TTL)
- [ ] Cache streak count (1min TTL)
- [ ] Cache invalidation on writes" --label "epic:backend,priority:medium"

# Epic 5: WebSocket Layer
gh issue create --title "[WebSocket] Initialize Gleam project" --body "## Story 5.1

Create Gleam project in \`apps/ws/\` with Mist framework.

### Acceptance Criteria
- [ ] \`apps/ws/gleam.toml\` configured
- [ ] Basic WebSocket endpoint
- [ ] App builds and runs" --label "epic:websocket,priority:high"

gh issue create --title "[WebSocket] JWT validation" --body "## Story 5.2

Implement Cloudflare Access JWT validation in Gleam.

### Acceptance Criteria
- [ ] JWT validation on WebSocket upgrade
- [ ] Reject unauthorized connections" --label "epic:websocket,priority:high"

gh issue create --title "[WebSocket] Redis Pub/Sub integration" --body "## Story 5.3

Subscribe to Redis Pub/Sub channels and broadcast to WebSocket clients.

### Acceptance Criteria
- [ ] Subscribe to \`ws:broadcast:{user_id}\` channel
- [ ] Subscribe to \`ws:community\` channel
- [ ] Broadcast messages to connected clients" --label "epic:websocket,priority:high"

gh issue create --title "[WebSocket] Presence tracking" --body "## Story 5.4

Track online users using Redis sets.

### Acceptance Criteria
- [ ] Add user to presence set on connect
- [ ] Remove user on disconnect
- [ ] Heartbeat to maintain presence" --label "epic:websocket,priority:medium"

# Epic 6: AI Coach
gh issue create --title "[AI Coach] Coach chat endpoint" --body "## Story 6.1

Implement \`POST /v1/coach/chat\` in Rust API.

### Acceptance Criteria
- [ ] Accept messages array + optional sessionId
- [ ] Load user profile for context
- [ ] Call LLM API with streaming
- [ ] Return streaming response" --label "epic:ai-coach,priority:high"

gh issue create --title "[AI Coach] Supermemory integration" --body "## Story 6.2

Integrate Supermemory for RAG context.

### Acceptance Criteria
- [ ] Get user profile from Supermemory
- [ ] Search relevant memories
- [ ] Ingest conversation summary after chat" --label "epic:ai-coach,priority:high"

gh issue create --title "[AI Coach] WebSocket streaming" --body "## Story 6.3

Stream coach responses via WebSocket.

### Acceptance Criteria
- [ ] Rust publishes chunks to Redis
- [ ] Gleam receives and forwards to WebSocket
- [ ] Client receives streaming response" --label "epic:ai-coach,priority:medium"

gh issue create --title "[AI Coach] Conversation storage" --body "## Story 6.4

Store coach conversations in MongoDB.

### Acceptance Criteria
- [ ] Save user and assistant messages
- [ ] Load conversation history by sessionId
- [ ] Paginate old conversations" --label "epic:ai-coach,priority:medium"

# Epic 7: Payments
gh issue create --title "[Payments] Polar.sh checkout" --body "## Story 7.1

Implement subscription checkout flow.

### Acceptance Criteria
- [ ] \`POST /v1/subscriptions/checkout\` creates Polar checkout
- [ ] Redirect to Polar hosted checkout
- [ ] Success redirect to profile page" --label "epic:payments,priority:high"

gh issue create --title "[Payments] Webhook handler" --body "## Story 7.2

Handle Polar.sh webhooks for payment events.

### Acceptance Criteria
- [ ] Verify webhook signature
- [ ] Handle order.paid, subscription.active, subscription.canceled
- [ ] Update subscription in PostgreSQL" --label "epic:payments,priority:high"

gh issue create --title "[Payments] TigerBeetle ledger" --body "## Story 7.3

Record payments in TigerBeetle double-entry ledger.

### Acceptance Criteria
- [ ] Create accounts for users
- [ ] Record transfers for payments
- [ ] Query user balance" --label "epic:payments,priority:medium"

gh issue create --title "[Payments] Subscription status sync" --body "## Story 7.4

Sync subscription status via WebSocket.

### Acceptance Criteria
- [ ] Publish subscription_update on status change
- [ ] Client receives real-time subscription update
- [ ] UI reflects subscription tier" --label "epic:payments,priority:medium"

# Epic 8: Deploy
gh issue create --title "[Deploy] Docker Compose for local dev" --body "## Story 8.1

Create docker-compose.yml for local development.

### Acceptance Criteria
- [ ] Redis, PostgreSQL, MongoDB, TigerBeetle containers
- [ ] API and WS containers
- [ ] \`docker compose up\` works" --label "epic:deploy,priority:high"

gh issue create --title "[Deploy] Fly.io deployment" --body "## Story 8.2

Deploy Rust API and Gleam WS to Fly.io.

### Acceptance Criteria
- [ ] fly.toml for API and WS
- [ ] Apps deploy successfully
- [ ] Health endpoints respond" --label "epic:deploy,priority:high"

gh issue create --title "[Deploy] Cloudflare Pages deployment" --body "## Story 8.3

Deploy web app to Cloudflare Pages.

### Acceptance Criteria
- [ ] Build output deployed
- [ ] Landing page accessible
- [ ] Dashboard accessible (with auth)" --label "epic:deploy,priority:high"

gh issue create --title "[Deploy] GitHub Actions CI/CD" --body "## Story 8.4

Set up CI/CD pipeline for automated deployments.

### Acceptance Criteria
- [ ] Build and test on PR
- [ ] Deploy to Fly.io on main push
- [ ] Deploy to Cloudflare Pages on main push" --label "epic:deploy,priority:medium"

echo ""
echo "Done! Created 38 issues across 8 epics."
echo "View them: gh issue list"
