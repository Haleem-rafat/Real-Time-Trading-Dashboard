# Real-Time Trading Dashboard

A fullstack real-time trading dashboard that streams live ticker prices over WebSocket and renders an interactive chart for selected financial instruments.

## Tech Stack

**Backend** — NestJS 11 · TypeScript · MongoDB (Mongoose 8.9+) · Socket.IO 4.8 · Redis · Passport JWT · Jest

**Frontend** — React 19 · TypeScript · Vite 6 · Tailwind CSS 4 · shadcn/ui · Redux Toolkit · SWR · Recharts · Socket.IO client

**Infra** — Docker · docker-compose

## Architecture

```
┌─────────────────┐  HTTPS/REST   ┌──────────────────┐   Mongoose   ┌─────────────┐
│  React 19 SPA   │ ─────────────▶│   NestJS 11 API  │─────────────▶│   MongoDB   │
│  (Vite 6 + TW4) │ ◀──── WS ─────│  Socket.IO 4.8   │              └─────────────┘
└─────────────────┘  Socket.IO    │  + Simulator     │   ioredis    ┌─────────────┐
                                  │  + Auth (JWT)    │─────────────▶│    Redis    │
                                  └──────────────────┘              └─────────────┘
```

A single in-process price simulator generates random-walk price ticks every second for 6 tickers (AAPL, TSLA, BTC-USD, ETH-USD, GOOGL, AMZN), persists them to MongoDB in batches, and fans out via Socket.IO rooms (one room per ticker symbol). Historical price queries are cached in Redis.

## Project Structure

```
real-time-trading-dashboard/
├── backend/                NestJS API + WebSocket gateway + simulator
├── frontend/               React 19 SPA dashboard
├── docker-compose.yml      MongoDB + Redis + backend + frontend
├── .env.example            Environment variable contract
└── README.md
```

## Quick Start

### Prerequisites
- Docker + Docker Compose
- (Optional for local dev) Node.js 20+

### Run with Docker (one command)

```bash
cp .env.example .env
docker compose up --build
```

Then open:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8080/api/v1
- **API docs (Swagger)**: http://localhost:8080/docs

### Local development

```bash
# Start MongoDB + Redis
docker compose up mongo redis -d

# Backend
cd backend && npm install && npm run start:dev

# Frontend (in another terminal)
cd frontend && npm install && npm run dev
```

## Features

- ✅ Live ticker prices streamed via WebSocket (1 tick/sec)
- ✅ Interactive chart with seeded historical data + appended live ticks
- ✅ Ticker switching with selection state
- ✅ Mock JWT authentication (register/login/me)
- ✅ Redis caching for historical price queries
- ✅ Responsive dashboard (sidebar on desktop, stacked on mobile)
- ✅ Dark trading-terminal aesthetic (neon green/red price flashes)
- ✅ Unit tests for backend logic
- ✅ Dockerized (multi-stage builds)

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | public | Register new user |
| POST | `/api/v1/auth/login` | public | Login with email/password |
| GET | `/api/v1/auth/me` | bearer | Get current user |
| GET | `/api/v1/tickers` | public | List all tickers |
| GET | `/api/v1/tickers/:symbol` | public | Get single ticker + last price |
| GET | `/api/v1/tickers/:symbol/history` | public | Get historical prices (cached) |
| GET | `/api/v1/health` | public | Health check |

## Socket.IO Events

**Client → Server**
- `subscribe:ticker { symbol }` — join ticker room
- `unsubscribe:ticker { symbol }` — leave ticker room
- `subscribe:tickers { symbols }` — bulk join

**Server → Client**
- `connection:ready` — handshake ack
- `price:update { symbol, price, change, changePct, timestamp }` — live tick

## Testing

```bash
cd backend
npm test              # unit tests
npm run test:cov      # with coverage
```

## Trade-offs & Notes

- **Single-process simulator** instead of Redis pub/sub — simpler for the demo. Horizontal scaling would use `@socket.io/redis-adapter` + Redis pub/sub for multi-replica fan-out.
- **Batched DB inserts** every 10 ticks to avoid hammering MongoDB on every tick.
- **In-memory `lastPrices` map** is the source of truth for the latest price; DB writes are async and don't block fan-out.
- **SWR for cacheable REST data, Redux for live tick stream** — clean separation of cacheable vs streaming state.
- **Recharts `isAnimationActive={false}`** is critical for smooth real-time updates.
- **Chart capped at 300 points** to keep Recharts performant on long sessions.
- **JWT-only auth (no refresh tokens)** — meets the "mock auth" requirement.
