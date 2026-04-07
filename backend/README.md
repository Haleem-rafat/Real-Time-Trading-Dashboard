# Backend — NestJS API + WebSocket gateway + price simulator

NestJS 11 service that powers the real-time trading dashboard. Exposes
a REST API, runs an in-process price simulator, fans out live ticks
over Socket.IO, evaluates user price alerts on every tick, and caches
historical queries in Redis.

See the [root README](../README.md) for the high-level architecture
and deployment guide. This document is a module-by-module reference.

---

## Table of contents

- [Running locally](#running-locally)
- [Project layout](#project-layout)
- [Bootstrap & global setup](#bootstrap--global-setup)
- [Module reference](#module-reference)
  - [`config/`](#config)
  - [`database/`](#database)
  - [`redis/`](#redis)
  - [`common/`](#common)
  - [`user/`](#user)
  - [`auth/`](#auth)
  - [`ticker/`](#ticker)
  - [`market-data/`](#market-data)
  - [`socket/`](#socket)
  - [`alert/`](#alert)
- [Testing](#testing)
- [Scripts](#scripts)

---

## Running locally

```bash
# from repo root
docker compose up mongo redis -d

cd backend
npm install
cp .env.example .env
npm run start:dev
```

The API is at `http://localhost:8080/api/v1` and Swagger at
`http://localhost:8080/docs`.

**Required env vars** — see the [root README](../README.md#environment-variables).
The defaults in `.env.example` are good for local Docker.

---

## Project layout

```
backend/
├── Dockerfile                          local docker-compose build
├── nest-cli.json
├── package.json
├── tsconfig*.json
├── eslint.config.mjs
├── .env.example
│
└── src/
    ├── main.ts                         bootstrap: CORS, Swagger, pipes
    ├── app.module.ts                   root module (global guard wiring)
    ├── app.controller.ts               health endpoint
    │
    ├── config/
    │   ├── configuration.ts            typed AppConfig loader
    │   └── validation.schema.ts        Joi schema, runs at boot
    │
    ├── database/database.module.ts     MongooseModule.forRootAsync
    ├── redis/redis.module.ts           CacheModule (global)
    │
    ├── common/
    │   ├── decorators/                 @Public, @UserFromPayload
    │   ├── enums/                      Routes, SocketEvents, AppEvents
    │   ├── filters/                    HttpExceptionFilter
    │   └── guards/                     JwtGuard (global, @Public opt-out)
    │
    ├── user/
    │   ├── user.schema.ts
    │   ├── user.service.ts
    │   └── user.module.ts
    │
    ├── auth/
    │   ├── auth.controller.ts          POST /auth/register|login, GET /auth/me
    │   ├── auth.service.ts             bcrypt + JwtService.sign
    │   ├── auth.service.spec.ts        3 test cases, happy + conflict + bad pw
    │   ├── strategies/jwt.strategy.ts  Bearer header extractor
    │   └── dto/                        register + login DTOs (class-validator)
    │
    ├── ticker/
    │   ├── ticker.controller.ts        REST endpoints (public)
    │   ├── ticker.service.ts           seed + backfill + history queries
    │   ├── ticker.service.spec.ts      seeding + cache hit path
    │   ├── schemas/ticker.schema.ts
    │   ├── schemas/historical-price.schema.ts
    │   ├── dto/history-query.dto.ts    range + interval + from/to
    │   └── seed/tickers.seed.ts        6 hard-coded seed tickers
    │
    ├── market-data/
    │   ├── market-data.module.ts
    │   ├── market-data.service.ts      perpetual setInterval, batched flush
    │   ├── market-data.service.spec.ts fake timers, mocked EventEmitter
    │   ├── price-generator.ts          pure Box-Muller + mean reversion
    │   └── price-generator.spec.ts
    │
    ├── socket/
    │   ├── market.gateway.ts           @WebSocketGateway, room fan-out
    │   └── ws-auth.middleware.ts       JWT auth for socket handshake
    │
    └── alert/
        ├── alert.controller.ts         POST / GET / DELETE /alerts
        ├── alert.service.ts            @OnEvent('price.tick'), shouldFire
        ├── alert.service.spec.ts       10 edge-case tests
        ├── schemas/alert.schema.ts
        └── dto/create-alert.dto.ts
```

---

## Bootstrap & global setup

**`main.ts`** wires the global concerns every request passes through:

1. **CORS** — `FRONTEND_URL` env var is parsed as a comma-separated list
   so multiple origins (production + preview + `*-git-main` aliases)
   can all authenticate.
2. **Global validation pipe** with `whitelist: true` so unknown body
   keys are stripped and invalid DTOs return 400.
3. **Swagger UI** mounted at `/docs` with `@ApiBearerAuth()` wired so
   you can "Authorize" once in the UI and hit protected routes.
4. **Bind to `0.0.0.0`** (not the default `::`) so IPv4 edge proxies
   like Render's and Fly's can reach the container — binding to `::`
   produced a "port not listening" error on Fly.

**`app.module.ts`** registers:

- `ConfigModule.forRoot({ isGlobal, load: [configuration], validationSchema })`
- `EventEmitterModule.forRoot()` — in-process pub/sub between market-data
  and the gateway + alert service
- `DatabaseModule` + `RedisModule` (both global)
- All feature modules
- `APP_GUARD: JwtGuard` — **every route is protected by default**. Mark
  public routes with `@Public()`.

---

## Module reference

### `config/`

`configuration.ts` builds an `AppConfig` object from `process.env`.
`validation.schema.ts` is a Joi schema that `ConfigModule` runs at boot,
so any missing / malformed env var fails startup instead of silently
becoming `undefined`.

The config is typed — consumers do
`configService.get<number>('tickIntervalMs')` and get a proper number.

### `database/`

`MongooseModule.forRootAsync` that reads `mongodb.url` and `mongodb.dbName`
from config. The `connectionFactory` hook logs the connection state
transitions (`connected` / `error` / `disconnected`) so production logs
always show when Mongo went away.

### `redis/`

Global `CacheModule` using `cache-manager-redis-yet` backed by
`ioredis`. TTLs are passed per-call (not globally) so each cached key
can have its own expiry.

### `common/`

Shared building blocks:

- **`@Public()`** decorator — metadata key that the global `JwtGuard`
  checks; when present, the guard skips auth. Used for `/auth/login`,
  `/auth/register`, `/tickers`, `/health`.
- **`@UserFromPayload()`** decorator — typed param decorator that
  returns the `JwtPayload` off `request.user`. Controllers never
  touch `request` directly.
- **`Routes` / `SocketEvents` / `AppEvents`** enums — avoid magic
  strings across the codebase and keep the frontend mirror enums
  in sync.
- **`HttpExceptionFilter`** — normalises error responses so the
  frontend always sees `{ message, error }`.
- **`JwtGuard`** — thin wrapper around Passport's `AuthGuard('jwt')`
  that respects the `@Public()` metadata.

### `user/`

Minimal user module — a schema with `email`, `password` (bcrypt-hashed),
`first_name`, `last_name` plus a service with `findByEmail` /
`findById` / `create`. The `toJSON` transform deletes `password` and
`__v` so user objects can be safely serialised in API responses.

### `auth/`

Classic NestJS JWT flow:

- **`POST /auth/register`** — validates, bcrypts the password, creates
  the user, signs a JWT with `{ sub, email }`, returns
  `{ access_token, user }`. Throws `ConflictException` on duplicate
  email.
- **`POST /auth/login`** — looks up the user by email, compares
  bcrypt hashes, signs a JWT. Throws `UnauthorizedException` on
  unknown email OR wrong password.
- **`GET /auth/me`** — `@UserFromPayload()` → lookup → return.
- **`JwtStrategy`** extracts the token from the `Authorization: Bearer`
  header using `passport-jwt`.
- **`JwtGuard`** is registered globally via `APP_GUARD` so *every*
  route is protected by default. Only routes annotated with
  `@Public()` skip auth — this makes it impossible to accidentally
  ship an unprotected endpoint.

`auth.service.spec.ts` has 3 tests: register happy path, duplicate email
conflict, and login wrong-password rejection.

### `ticker/`

The heaviest service in the app — seeds the DB on boot, backfills
historical data, serves REST queries with Redis caching, and exposes a
`tickerExists()` helper for the alert service.

**Seeding** (`seedTickers`)
- Runs `dedupeTickers()` first to heal any duplicate rows left over
  from concurrent boots against a fresh DB (see [Trade-offs](#trade-offs)).
- Uses a single `bulkWrite` of `updateOne({ upsert: true, $setOnInsert })`
  operations so concurrent boots all converge on the same 6-row state
  without overwriting live mutations.

**Historical backfill** (`backfillHistoryIfEmpty`)
- Runs once per symbol (gated on `existing > 0`).
- Generates **three tiers** of data per symbol so the chart's range
  selector has sensible data at every zoom level:
  - Last 24h at 1-minute granularity → powers the **1H** + **1D** views
  - Last 60d at 1-hour granularity → powers the **1W** + **1M** views
  - Last 5y at 1-day granularity → powers the **1Y** + **5Y** views
- Volatility is scaled by `sqrt(stepMs / 1s)` — longer buckets get
  proportionally more per-step volatility so they look like
  longer-term movement instead of compounding per-tick noise into
  unrealistic waves.
- Mean reversion anchors the walk to `base_price` so the 5-year
  series stays recognisable instead of drifting off to zero or
  infinity.
- Inserts are batched at 5,000 docs per `insertMany` call to stay
  comfortably under Mongo's payload limit.

**History queries** (`getHistory`)
- Two modes:
  - **Preset**: `?range=1h|1d|1w|1mo|1y|5y` — converts to a `since`
    timestamp, picks a sensible default `interval` per range
    (`defaultIntervalFor`).
  - **Custom**: `?from=<ISO>&to=<ISO>` — ignores `range`, picks an
    interval based on the span (`pickIntervalForSpan`) so a 1-week
    custom window gets hourly buckets and a 2-year window gets
    daily buckets.
- Raw Mongo points are bucketed into the requested interval on the
  fly (average price per bucket) and the result is cached in Redis
  for 30s keyed by `history:<SYMBOL>:<range>:<interval>` or
  `history:<SYMBOL>:custom:<from>:<to>:<interval>`.

**REST**

| Method | Path | Auth | Cache TTL |
|---|---|---|---|
| `GET` | `/tickers` | public | 60s |
| `GET` | `/tickers/:symbol` | public | — |
| `GET` | `/tickers/:symbol/history` | public | 30s |

### `market-data/`

In-process price simulator. On `onModuleInit` it:

1. Loads all active tickers from the DB.
2. Seeds an in-memory `state` map keyed by symbol with the *last known
   price* (from historical data if any, otherwise `base_price`).
3. Stores `sessionOpen = lastPrice` for each symbol — the stable
   reference used to compute `change` / `changePct` in tick payloads.
4. Starts a `setInterval` at `tickIntervalMs` (default 500ms).

**On every tick**, for every symbol in `state`:

1. Compute a mean-reverted drift pulling the price toward `basePrice`
   with strength `MEAN_REVERSION_STRENGTH = 0.005`.
2. Call `nextPrice(prev, volatility, drift)` (`price-generator.ts`) —
   a pure Box-Muller transform producing the next sample from a
   normal distribution.
3. Round to 2 decimals.
4. Compute `change = next - sessionOpen` and `changePct`.
5. Update the in-memory state.
6. Emit `AppEvents.PRICE_TICK` on the `EventEmitter2` bus.
7. Push `{ symbol, price, timestamp }` into the write buffer.

Every 10 ticks the write buffer is flushed via `appendHistory()` which
does a single `insertMany` — this keeps Mongo write load an order of
magnitude below the tick rate.

**`price-generator.ts`** is the **only** place randomness lives,
kept as a pure function so its unit tests can inject a seeded RNG
and assert deterministic output.

### `socket/`

**`MarketGateway`** — `@WebSocketGateway` wired with CORS from env.

- **`handleConnection`** — on every new socket, emits `connection:ready`.
- **`@SubscribeMessage('subscribe:ticker')`** — validates the symbol,
  calls `client.join('ticker:' + symbol)`, acks with the last known
  price from `MarketDataService.getLastPrice()`.
- **`@SubscribeMessage('subscribe:tickers')`** — bulk variant, acks
  with a `{ symbol: price }` snapshot.
- **`@SubscribeMessage('unsubscribe:ticker')`** — `client.leave`.
- **`@OnEvent(AppEvents.PRICE_TICK)`** — forwards every tick into the
  corresponding `ticker:<SYMBOL>` room with the `price:update` event.
  Clients only receive ticks for symbols they've subscribed to.
- **`@OnEvent(AppEvents.ALERT_TRIGGERED)`** — forwards triggered
  alerts into the owner's `user:<userId>` room with the
  `alert:triggered` event, so other users don't see each other's
  notifications.

**`WSAuthMiddleware`** verifies the JWT on `handshake.auth.token`
and attaches the payload to `client.data.user`. If `ALLOW_ANON_WS`
is true, unauthenticated clients are allowed but their
`data.user` is `undefined` and they never join any `user:*` room.

### `alert/`

Per-user price alerts that fire when the market crosses a threshold.

**Schema**
- `user` (ObjectId, ref User)
- `symbol` (string)
- `direction: 'above' | 'below'`
- `price` (the threshold)
- `reference_price` (the price when the alert was created — used so an
  alert that was created "already past" doesn't fire on the very first
  tick)
- `triggered_at`, `triggered_price` (filled when it fires)
- `is_active` (flipped to `false` on fire)
- Compound index `{ symbol: 1, is_active: 1 }` for the tick-time lookup

**Tick handler** (`@OnEvent('price.tick')`)

```
for each active alert matching tick.symbol:
  if shouldFire(direction, price, reference_price, tick.price):
    mark triggered_at = now, triggered_price = tick.price, is_active = false
    emit AppEvents.ALERT_TRIGGERED { userId, alert }
```

`shouldFire(direction, threshold, refPrice, currentPrice)` is a **pure
function** that returns `true` only when:
- `direction === 'above'` and price crosses *up* through the threshold
  (i.e. `refPrice <= threshold && currentPrice >= threshold`)
- `direction === 'below'` and price crosses *down* through the
  threshold

This guards against the "already past at creation" case — if you set
"above $100" when the price is already $105, the alert won't fire
until the price drops and comes back.

`alert.service.spec.ts` has 10 unit tests covering above/below
crossings, equal-to-threshold, already-past-at-creation, and edge
cases.

**REST**

| Method | Path | Body | Response |
|---|---|---|---|
| `POST /alerts` | `{ symbol, direction, price }` | Created alert |
| `GET /alerts` | — | Current user's alerts |
| `DELETE /alerts/:id` | — | 204 |

All routes are JWT-guarded. `POST` validates the symbol via
`TickerService.tickerExists()` so users can't create alerts for
non-existent tickers.

---

## Testing

```bash
npm test              # 27 unit tests across 5 suites
npm run test:watch    # watch mode
npm run test:cov      # with coverage report
```

**Suites**

| Suite | File | Tests |
|---|---|---|
| AuthService | `src/auth/auth.service.spec.ts` | 3 |
| TickerService | `src/ticker/ticker.service.spec.ts` | 3 |
| MarketDataService | `src/market-data/market-data.service.spec.ts` | 4 |
| PriceGenerator | `src/market-data/price-generator.spec.ts` | 7 |
| AlertService | `src/alert/alert.service.spec.ts` | 10 |

All service tests mock Mongoose with `jest.Mocked<Model<T>>` — no real
database is needed. The simulator test uses Jest's fake timers to
assert the emit count over a simulated minute of runtime.

---

## Scripts

| Script | Description |
|---|---|
| `npm run start` | Run the compiled app (`dist/main.js`) |
| `npm run start:dev` | Watch mode with hot reload |
| `npm run start:debug` | Watch mode with `--inspect-brk` |
| `npm run start:prod` | Explicit prod start (same as `start`) |
| `npm run build` | `nest build` → writes to `dist/` |
| `npm run lint` | `eslint --fix` across the src tree |
| `npm run format` | `prettier --write` |
| `npm test` | Jest unit tests |
| `npm run test:watch` | Jest watch mode |
| `npm run test:cov` | Jest with coverage |
| `npm run test:e2e` | Jest e2e (empty for now) |

---

## Trade-offs

- **Single-process simulator** — fine for one replica; horizontal
  scale needs `@socket.io/redis-adapter` and an external scheduler.
- **In-memory `lastPrices`** — the source of truth for the latest
  tick. DB writes are async and don't block fan-out.
- **Dedupe-on-boot** — concurrent boots against a fresh DB can
  produce duplicate ticker rows before the unique index is built.
  `dedupeTickers` heals every boot, making the seeding idempotent
  under any race condition.
- **Validation-pipe `whitelist`** — unknown request body keys are
  silently dropped instead of rejected. This is the Nest default
  but worth noting.
- **JWT-only auth (no refresh tokens)** — meets the "mock auth"
  requirement without the complexity of token rotation.
