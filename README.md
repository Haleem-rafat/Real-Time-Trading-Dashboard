# Real-Time Trading Dashboard

A fullstack real-time trading dashboard that simulates a market feed, streams
live ticker prices over WebSocket, and renders an interactive chart with
historical context, price alerts, and a dark/light terminal UI.

Built as a coding challenge — the goal was to demonstrate a clean fullstack
architecture with streaming state, proper error handling, deployment to free
tier infrastructure, and production-grade UX polish.

**Live demo**

- Frontend → <https://real-time-trading-dashboard-five.vercel.app>
- Backend → <https://real-time-trading-dashboard.onrender.com>
- API docs (Swagger) → <https://real-time-trading-dashboard.onrender.com/docs>

> The Render free tier cold-starts after ~15 minutes of inactivity, so the
> first request after an idle period can take 20-40s while the container
> boots. The frontend retries automatically — just wait for the spinner to
> turn into the chart.

---

## Table of contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Quick start](#quick-start)
- [Deployment](#deployment)
- [API reference](#api-reference)
- [WebSocket protocol](#websocket-protocol)
- [Environment variables](#environment-variables)
- [Trade-offs & design notes](#trade-offs--design-notes)

---

## Features

| Area | Feature |
|---|---|
| **Live data** | 6 seeded tickers (AAPL, TSLA, GOOGL, AMZN, BTC-USD, ETH-USD) streamed every 500ms over Socket.IO |
| **Chart** | Recharts area chart with tiered backfill (minute/hour/day) + range filter (1H / 1D / 1W / 1M / 1Y / 5Y / custom date picker) |
| **Baseline** | Dashed "session open" reference line so the chart color always agrees with the row's ± badge |
| **Alerts** | Per-user price alerts (above/below threshold) evaluated on every tick, fan-out to the creating user via Socket.IO rooms, toast notification on fire |
| **Auth** | Mock JWT register/login/me — bcrypt password hashing, 24h access tokens, automatic 401 → logout |
| **Caching** | Redis-cached `/tickers` + `/tickers/:symbol/history` responses |
| **Theming** | Dark terminal theme with a full light-mode override and live OS `prefers-color-scheme` following |
| **SEO / PWA** | Open Graph + Twitter card, JSON-LD `WebApplication` schema, `site.webmanifest`, `robots.txt`, `sitemap.xml`, branded SVG favicon + OG image |
| **Resilience** | SWR retry-with-backoff for cold-start recovery, global `RouteErrorBoundary`, chart `<ChartSkeleton>` + spinner states |
| **Responsive** | Sidebar + chart on `lg+`, mobile ticker strip nav below `lg` |

---

## Architecture

```
 ┌──────────────────────┐   HTTPS / REST    ┌────────────────────────┐
 │   React 19 SPA       │ ────────────────▶ │   NestJS 11 API        │
 │   (Vite 6 + TW4)     │ ◀──── Socket.IO ─ │   (market.gateway.ts)  │
 │   Vercel             │                   │   Render               │
 └──────────────────────┘                   └────────────┬───────────┘
                                                         │
                                     ┌───────────────────┼──────────────────┐
                                     │                   │                  │
                                     ▼                   ▼                  ▼
                        ┌─────────────────┐  ┌───────────────────┐  ┌────────────┐
                        │  MongoDB Atlas  │  │  Upstash Redis    │  │  EventBus  │
                        │  (tickers,      │  │  (cache + SWR     │  │  (in-proc  │
                        │   history,      │  │   history)        │  │   price    │
                        │   users,        │  └───────────────────┘  │   ticks)   │
                        │   alerts)       │                         └────────────┘
                        └─────────────────┘
```

**Data flow**

1. `MarketDataService` (`@nestjs/schedule`-free `setInterval`) generates a
   price tick for every seeded symbol every `TICK_INTERVAL_MS` (default 500ms)
   using a mean-reverted random walk (`price-generator.ts`).
2. Each tick is emitted on the Nest `EventEmitter2` bus as `price.tick`.
3. `MarketGateway` (`@OnEvent`) forwards the tick into the corresponding
   `ticker:<SYMBOL>` Socket.IO room. Only clients subscribed to that symbol
   receive it.
4. `AlertService` (`@OnEvent`) runs the same tick through every matching
   active alert, writes `is_active=false` on fire, and emits an
   `alert.triggered` event that the gateway fans out to the owning user's
   `user:<userId>` room.
5. Frontend `SocketProvider` dispatches incoming ticks into the
   `livePricesSlice` (Redux), which is read by the chart, the ticker row's
   `<PriceFlash>`, and the alert toast.
6. Historical `/tickers/:symbol/history` queries are bucketed into the
   requested interval and cached in Redis for 30s.

---

## Tech stack

### Backend

| Category | Library |
|---|---|
| Framework | NestJS 11, TypeScript 5.5 |
| Database | MongoDB (Mongoose 8.9) |
| Cache | Redis via `@nestjs/cache-manager` + `cache-manager-redis-yet` |
| Realtime | Socket.IO 4.8 (`@nestjs/websockets`) |
| Events | `@nestjs/event-emitter` |
| Auth | Passport JWT, `bcrypt` |
| Validation | `class-validator`, `class-transformer`, Joi env |
| Docs | `@nestjs/swagger` at `/docs` |
| Testing | Jest (27 unit tests, 5 suites) |

### Frontend

| Category | Library |
|---|---|
| Framework | React 19.2, TypeScript 6 |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 (CSS-first `@theme`), shadcn/ui primitives |
| State | Redux Toolkit (live ticks, selected ticker, triggered alerts, auth), SWR (REST cache) |
| Forms | React Hook Form + Zod |
| Routing | `react-router` v7 with `errorElement` boundaries |
| Realtime | `socket.io-client` |
| Charts | Recharts 3 |
| Icons | Lucide React |

### Infrastructure

| Component | Provider | Tier |
|---|---|---|
| Frontend | Vercel | Hobby (free) |
| Backend | Render | Free web service |
| MongoDB | Atlas | M0 (free) |
| Redis | Upstash | Free |

---

## Project structure

```
real-time-trading-dashboard/
├── README.md                      ← you are here
├── docker-compose.yml             ← 4-service local stack
├── Dockerfile                     ← repo-root Dockerfile used by Render
├── fly.toml                       ← (legacy) Fly.io config, kept for history
├── .dockerignore
├── .env.example
│
├── backend/                       ← NestJS API + WebSocket gateway
│   ├── src/
│   │   ├── main.ts                bootstrap (CORS, Swagger, validation)
│   │   ├── app.module.ts          root module
│   │   ├── alert/                 price-threshold alerts
│   │   ├── auth/                  register / login / me (JWT)
│   │   ├── common/                decorators, enums, filters, guards
│   │   ├── config/                typed env loader (Joi-validated)
│   │   ├── database/              MongooseModule.forRootAsync
│   │   ├── market-data/           price simulator + pure generator
│   │   ├── redis/                 CacheModule
│   │   ├── socket/                MarketGateway (Socket.IO)
│   │   ├── ticker/                REST + seed + historical backfill
│   │   └── user/                  User schema + service
│   ├── Dockerfile                 local docker-compose version
│   └── README.md                  backend deep-dive
│
├── frontend/                      ← React SPA
│   ├── src/
│   │   ├── main.tsx               provider stack root
│   │   ├── app.css                Tailwind 4 @theme + light override
│   │   ├── app/                   api client, constants, router
│   │   ├── context/               SocketProvider, ThemeProvider
│   │   ├── hooks/                 useTickers, useTickerHistory, useAlerts…
│   │   ├── modules/
│   │   │   ├── Auth/              login + register pages
│   │   │   └── Dashboard/         layout, pages, views, components
│   │   ├── store/                 Redux slices
│   │   ├── shared/
│   │   │   ├── UI/                MainInput, Button, MainModal…
│   │   │   └── components/        RouteErrorBoundary
│   │   └── shadecn/               shadcn/ui primitives
│   ├── public/                    favicon, og-image, manifest, robots
│   ├── Dockerfile                 nginx static serve
│   ├── nginx.conf                 SPA fallback + /api/ + /socket.io/ proxy
│   └── README.md                  frontend deep-dive
│
└── .claude/                       project agent config (ignored in prod)
```

---

## Quick start

### Prerequisites

- Node.js 22+ (for local dev)
- Docker + Docker Compose (for one-command run)
- No `fly` / `vercel` / `render` CLI required to run locally

### Run with Docker (one command)

```bash
docker compose up --build
```

Brings up **four services** on a single bridge network:

- `mongo` (healthchecked)
- `redis` (healthchecked)
- `backend` (waits for mongo + redis to be healthy)
- `frontend` (nginx, serves the built SPA and reverse-proxies `/api/` + `/socket.io/` to `backend:8080`)

Open:

| Page | URL |
|---|---|
| Frontend | <http://localhost:5173> |
| Backend API | <http://localhost:8080/api/v1> |
| Swagger docs | <http://localhost:8080/docs> |
| Health | <http://localhost:8080/api/v1/health> |

First boot takes ~30s while Mongo/Redis become healthy and the ticker
seeder runs its 3-tier historical backfill (minute + hourly + daily).

### Local development (no Docker)

```bash
# 1. Start MongoDB + Redis only
docker compose up mongo redis -d

# 2. Backend — terminal 1
cd backend
npm install
cp .env.example .env          # adjust if needed
npm run start:dev             # http://localhost:8080

# 3. Frontend — terminal 2
cd frontend
npm install
cp .env.example .env          # adjust if needed
npm run dev                   # http://localhost:5173 (or 5174 if 5173 busy)
```

---

## Deployment

The current production stack is **Vercel (frontend) + Render (backend) +
MongoDB Atlas + Upstash Redis**. All four components are on free tiers.

> The repo originally targeted Fly.io — the `fly.toml` and root `Dockerfile`
> are still there and work, but the backend now lives on Render. Both
> platforms read the same `Dockerfile`, so switching back is a one-line
> change in the Vercel env vars.

### 1. Databases (free)

- **MongoDB Atlas** — create an M0 cluster, allow `0.0.0.0/0` in the IP
  allowlist, copy the SRV connection string.
- **Upstash Redis** — create a free database, copy the `rediss://...` URL.

### 2. Backend → Render

1. Create a new Render **Web Service** from the GitHub repo.
2. Environment: `Docker`. Root directory: `/` (repo root). Render picks up
   the root `Dockerfile` automatically.
3. Port: `8080`.
4. Set environment variables (see [the env table below](#environment-variables)).
   Critical ones:
   - `MONGODB_URL`
   - `REDIS_URL`
   - `JWT_SECRET` (generate with `openssl rand -base64 48`)
   - `FRONTEND_URL` — comma-separated Vercel origins
5. Deploy. The service will be reachable at
   `https://<your-service>.onrender.com`.

### 3. Frontend → Vercel

1. `vercel login` + `vercel link` inside `frontend/`, or create the
   project from the Vercel dashboard.
2. **Root directory** must be set to `frontend` (the Vercel CLI had a
   known bug where importing the repo root produced an empty rootDir —
   if the first deploy fails instantly, `PATCH` the project via the REST
   API and set `rootDirectory: "frontend"`).
3. Environment variables (Production scope):
   - `VITE_API_URL=https://<your-service>.onrender.com/api/v1`
   - `VITE_SOCKET_URL=https://<your-service>.onrender.com`
4. Push → Vercel auto-deploys from `main`.

### 4. Wire CORS

Set `FRONTEND_URL` on Render to the Vercel origins (comma-separated —
production + preview + `*-git-main` alias):

```
https://<project>.vercel.app,https://<project>-<team>.vercel.app,https://<project>-git-main-<team>.vercel.app
```

The backend's `main.ts` parses `FRONTEND_URL?.split(',')` so multiple
origins are supported.

---

## API reference

All routes are prefixed with `/api/v1`. Full interactive docs at
`/docs` (Swagger).

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | public | Register; returns `{ access_token, user }` |
| `POST` | `/auth/login` | public | Login; returns `{ access_token, user }` |
| `GET` | `/auth/me` | bearer | Current user from JWT payload |

### Tickers

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/tickers` | public | List all tickers (Redis cached 60s) |
| `GET` | `/tickers/:symbol` | public | Single ticker + last known price |
| `GET` | `/tickers/:symbol/history` | public | Bucketed historical prices (Redis cached 30s) |

**History query params**

```
?range=1h|1d|1w|1mo|1y|5y        # preset range
?from=<ISO>&to=<ISO>             # custom window (ignores range)
?interval=1m|5m|1h|1d            # optional; sensible default per range
```

### Alerts

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/alerts` | bearer | Create a price alert |
| `GET` | `/alerts` | bearer | List the current user's alerts |
| `DELETE` | `/alerts/:id` | bearer | Delete an alert |

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | public | Liveness probe |

---

## WebSocket protocol

Socket.IO namespace: default (`/`). Auth via `handshake.auth.token`
(JWT). Anonymous is allowed if `ALLOW_ANON_WS=true`.

### Client → server

| Event | Payload | Effect |
|---|---|---|
| `subscribe:ticker` | `{ symbol: string }` | Join `ticker:<SYMBOL>` room, ack with last price |
| `unsubscribe:ticker` | `{ symbol: string }` | Leave room |
| `subscribe:tickers` | `{ symbols: string[] }` | Bulk join, ack with snapshot map |

### Server → client

| Event | Payload | When |
|---|---|---|
| `connection:ready` | — | Handshake completed |
| `price:update` | `{ symbol, price, change, changePct, timestamp }` | Every live tick, per room |
| `alert:triggered` | `{ alertId, symbol, direction, price, triggeredPrice, triggeredAt }` | When one of the current user's alerts fires |

---

## Environment variables

### Backend (`backend/.env`)

| Var | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | `development` / `production` |
| `PORT` | `8080` | HTTP listen port |
| `MONGODB_URL` | `mongodb://localhost:27017/trading` | Mongo connection string |
| `MONGODB_DB_NAME` | `trading` | Database name |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string (use `rediss://` for TLS) |
| `JWT_SECRET` | `dev-secret-change-me` | HMAC key for JWT signing |
| `JWT_EXPIRES` | `24h` | Access token TTL |
| `FRONTEND_URL` | `http://localhost:5173` | Comma-separated allowed CORS origins |
| `ALLOW_ANON_WS` | `true` | Permit anonymous WebSocket connections |
| `TICK_INTERVAL_MS` | `500` | Price simulator tick interval |

### Frontend (`frontend/.env`)

| Var | Local default | Production |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8080/api/v1` | `https://<backend>.onrender.com/api/v1` |
| `VITE_SOCKET_URL` | `http://localhost:8080` | `https://<backend>.onrender.com` |

In the Docker Compose setup the frontend nginx reverse-proxies `/api/`
and `/socket.io/` to the backend container, so the browser sees a
single origin and **no CORS preflight is needed**.

---

## Trade-offs & design notes

- **Single-process simulator** instead of Redis pub/sub — simpler for the
  demo. Horizontal scaling would need
  `@socket.io/redis-adapter` + Redis pub/sub for multi-replica fan-out.
- **Batched DB inserts** — the simulator buffers ticks and flushes every
  10 ticks so we don't hammer Mongo on every tick.
- **Mean-reverted random walk** — both live tick generation and the
  historical backfill pull prices back toward `base_price` with
  `MEAN_REVERSION_STRENGTH`. Without that a pure random walk drifts to
  zero or infinity over a long session.
- **Session-relative `change` / `changePct`** — tick payloads compute the
  change against the `sessionOpen` price (first price the simulator saw
  for that symbol) instead of per-tick delta. This makes the "+2.34%"
  badge stable enough to display without flipping sign on every tick.
- **Tiered backfill** — every fresh DB gets 24h of minute data + 60d of
  hourly data + 5y of daily data per symbol, with volatility scaled by
  `sqrt(stepMs / 1s)` so longer buckets look like longer-term movement
  instead of compounding per-tick noise into unrealistic waves.
- **YAxis floor** — the chart clamps its YAxis to a minimum half-range
  of 0.4% of price. Without this, a 5¢ wiggle on a $200 stock
  auto-zooms into a giant visual wave.
- **Sliding visible window (live view only)** — the 1H chart caps its
  visible buffer at 60 points so new ticks take a meaningful fraction
  of the chart width. Longer ranges render the full series.
- **Redux for live, SWR for REST** — clean separation. Live ticks fire
  every 500ms and don't belong in SWR's cache; SWR handles the REST
  endpoints that benefit from dedupe + revalidation.
- **Self-heal in `TickerService`** — if two instances boot
  simultaneously against a fresh DB before the unique index is built,
  both run `insertMany(SEED_TICKERS)` and produce duplicates.
  `dedupeTickers()` cleans the extras on every boot.
- **SWR retries for Render cold-starts** — the frontend hooks enable
  exponential-backoff retries because the Render free tier sleeps
  after 15 minutes and the first request after a cold start can 502.
- **`key={symbol}` on `<LiveChart>`** — the chart unmounts fully on
  symbol switch so the previous ticker's points never flash. Range
  switches are handled *inside* the component with a crossfade so the
  SWR + subscription state is preserved.
- **Route-level `errorElement`** — a single `RouteErrorBoundary`
  renders for every top-level route so an uncaught render error can
  never produce a blank page.

---

## Repository deep-dives

- [`backend/README.md`](./backend/README.md) — module-by-module backend walkthrough
- [`frontend/README.md`](./frontend/README.md) — SPA architecture, state, theming, component catalogue
