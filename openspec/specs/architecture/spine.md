# FitMentor Architecture Spine

> Last updated: 2026-07-20
> Status: Draft — review and correct [ASSUMPTION] tags

---

## Paradigm

**Monorepo with shared core.** Mobile (React Native) and web (Vite+React) share types, utils, and API client via `packages/shared/`. Backend services are separate apps under `apps/`.

---

## AD-1: Monorepo Structure

| | |
|---|---|
| **Binds** | All apps and packages |
| **Prevents** | Duplicated types, utils, API client code across apps |
| **Rule** | npm workspaces. Root `package.json` defines `workspaces: ["apps/*", "packages/*"]`. Each app/package has its own `package.json`. |

```
FitMentor/
├── apps/
│   ├── mobile/          # React Native (bare)
│   ├── web/             # Vite+React (landing + dashboard)
│   ├── api/             # Rust (Axum) — future
│   └── ws/              # Gleam (Mist) — future
├── packages/
│   └── shared/          # Types, utils, constants (TypeScript)
├── docs/
│   └── ARCHITECTURE.md  # Full backend architecture (reference)
└── package.json         # Workspace root
```

---

## AD-2: React Native (Bare)

| | |
|---|---|
| **Binds** | Mobile app implementation |
| **Prevents** | Expo managed workflow lock-in |
| **Rule** | Bare React Native via `@react-native-community/cli`. Manual native setup. |

**Key choices:**
- **Navigation:** React Navigation (native stack + bottom tabs)
- **Storage:** `@react-native-async-storage/async-storage` (replaces localStorage)
- **UI:** React Native components + `react-native-reanimated` for animations
- **State:** React Query for server state, Zustand for client state
- **HTTP:** `@tanstack/react-query` + `fetch` (same query layer as web)

**Why bare over Expo:** User wants full control over native code, no managed workflow constraints. Trade-off: more setup, manual build config.

---

## AD-3: Web App

| | |
|---|---|
| **Binds** | Landing page and dashboard |
| **Prevents** | Separate landing page apps |
| **Rule** | Single Vite+React app. Landing at `/`, dashboard at `/dashboard`. |

**Key choices:**
- **Framework:** Vite + React (existing, no change)
- **Routing:** TanStack Router (existing)
- **UI:** Tailwind CSS + Radix UI (existing)
- **Auth:** Cloudflare Access (JWT in header)

**Web app scope (MVP):**
- Landing page (`/`) — marketing, features, CTA
- Dashboard (`/dashboard`) — daily habits, protein tracking, AI coach chat
- Profile (`/profile`) — view/edit profile
- NO workout plans, nutrition plans, tools (those stay mobile-only for now)

---

## AD-4: Backend Architecture

| | |
|---|---|
| **Binds** | All backend services |
| **Prevents** | Monolithic backend, direct DB access from frontend |
| **Rule** | Follow `docs/ARCHITECTURE.md`. REST API (Rust/Axum) + WebSocket (Gleam/Mist). |

**Services:**
- **Rust API** (`:3000`) — REST endpoints, business logic, auth, DB writes
- **Gleam WS** (`:8080`) — WebSocket gateway, Redis Pub/Sub consumer
- **PostgreSQL** — Users, profiles, subscriptions, daily_logs
- **MongoDB** — Community posts, coach conversations, analytics
- **Redis** — Cache, Pub/Sub, sessions, rate limits
- **TigerBeetle** — Payment ledger (double-entry accounting)

**[ASSUMPTION]** Full backend build happens after mobile + web MVPs are working.

---

## AD-5: Shared Code (`packages/shared/`)

| | |
|---|---|
| **Binds** | Mobile and web apps |
| **Prevents** | Type drift, duplicated business logic |
| **Rule** | All types, utils, constants live here. Both apps import from `@fitmentor/shared`. |

**Contents:**
- `types/` — Profile, DailyLog, WorkoutDay, Exercise, MealPlan, etc.
- `utils/` — calcBmr, calcTdee, calcTargets, computeStreak, etc.
- `constants/` — GOAL_LABEL, HEALTH_OPTIONS, EXERCISE_LIBRARY, etc.
- `api/` — API client (fetch wrapper, types for all endpoints)

---

## AD-6: Navigation

| | |
|---|---|
| **Binds** | Mobile and web apps |
| **Prevents** | Inconsistent navigation patterns |
| **Rule** | React Navigation (mobile), TanStack Router (web). Shared route structure where possible. |

**Mobile routes:**
```
/ (Home) → BottomTab
/workouts → BottomTab
/tools → BottomTab
/coach → BottomTab (accent)
/nutrition → BottomTab
/profile → BottomTab
/onboarding → Stack (modal)
/exercise/:name → Stack (push)
```

**Web routes:**
```
/ — Landing page (public)
/dashboard — Dashboard (auth required)
/profile — Profile (auth required)
/coach — AI Coach (auth required)
```

---

## Deferred

These decisions are intentionally postponed:

- **UI component library** — NativeBase vs React Native Paper vs custom. Decision: after first screen is built.
- **Testing strategy** — Jest + React Native Testing Library? Vitest for web? Decision: after MVP works.
- **CI/CD pipeline** — GitHub Actions for builds, EAS for mobile? Decision: before first release.
- **Monorepo tooling** — Turborepo vs just npm workspaces? Decision: start with workspaces, add Turborepo if builds are slow.

---

## Open Questions

1. Should the web dashboard reuse the same UI component library as mobile?
2. How to share themes/colors between React Native and web Tailwind?
3. What's the minimum viable backend before mobile app is useful?
4. Should we use a shared API client package or duplicate fetch calls?

---

*This spine is the consistency contract. All implementation decisions must align with these ADs. If an AD needs updating, amend it here first, then implement.*
