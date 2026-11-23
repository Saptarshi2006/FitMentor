<div align="center">

# 🏋️ FitMentor

**AI-powered fitness coach built for Indian beginners** — personalized workouts,
affordable Indian meal plans, daily habit tracking and a real-time AI coach
streamed over WebSockets. Ships as a **PWA** and a **native Android app**.

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white&style=flat-square)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black&style=flat-square)](https://react.dev/)
[![Rust](https://img.shields.io/badge/Rust-000000?logo=rust&logoColor=white&style=flat-square)](https://www.rust-lang.org/)
[![Redis](https://img.shields.io/badge/Redis-FF4438?logo=redis&logoColor=white&style=flat-square)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white&style=flat-square)](https://www.docker.com/)

[**Live →**](https://fitmentor-7lx.pages.dev) · [**Architecture →**](docs/ARCHITECTURE.md)

</div>

---

## ✨ Features

- **Personalized workout plans** — built around equipment, schedule and experience level
- **Affordable Indian meal plans** — real grocery lists, real rupee budgets, regional food
- **Daily habit tracking** — streaks, check-ins and progress you can actually see
- **Real-time AI coach** — streamed chat over WebSockets, not blocking request/response
- **PWA + native Android** — installable on any phone, works offline-first
- **Payments** — subscription flows via Polar.sh

## 🏗️ Architecture

A polyglot monorepo — right tool for each job, one `docker-compose up` to run it all.

```
FitMentor/
├── apps/
│   ├── web/        # TanStack Start · Vite · React — PWA
│   ├── mobile/     # React Native — native Android app
│   ├── api/        # REST API (Rust · Axum · SQLx)
│   └── ws/         # WebSocket gateway — real-time AI coach stream
├── microservices/
│   └── daily-planner/   # scheduling & plan-generation service
├── packages/
│   └── shared/     # shared types & contracts
├── docs/
│   └── ARCHITECTURE.md   # single source of truth — schemas, endpoints, flows
└── docker-compose.yml
```

**Stack:** Rust (Axum, SQLx) · TypeScript (React, TanStack Start) · Gleam · Redis · PostgreSQL · React Native

## 🚀 Quickstart

```bash
git clone https://github.com/Saptarshi2006/FitMentor.git
cd FitMentor
cp .env.example .env        # fill in your keys
docker compose up           # builds and runs the whole system
```

Individual apps:

```bash
cd apps/web && npm install && npm run dev      # PWA  → localhost
cd apps/api && cargo run                       # REST → api port
```

## 📚 Docs

| Doc | What's inside |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Service topology, DB schemas, Redis structures, auth, REST spec, WebSocket protocol, payment & AI-coach flows |

## 🗄️ Data layer

- **PostgreSQL** — relational core (users, plans, subscriptions)
- **Redis** — sessions, rate limits, realtime state
- **Axum + SQLx** — compile-checked queries, no ORM magic

---

<div align="center">

Built with ❤️ by [Saptarshi Mukherjee](https://github.com/Saptarshi2006)

</div>
