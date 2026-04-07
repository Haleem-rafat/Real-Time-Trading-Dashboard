# Frontend — React 19 trading dashboard SPA

Vite + React 19 single-page app that renders the real-time trading
dashboard: ticker list with live price flashes, interactive chart with
a date-range filter, per-user price alerts, and a dark/light theme
that follows the OS by default.

See the [root README](../README.md) for the high-level architecture
and deployment guide. This document is an SPA-level deep-dive.

---

## Table of contents

- [Running locally](#running-locally)
- [Tech choices](#tech-choices)
- [Project layout](#project-layout)
- [Provider stack](#provider-stack)
- [State management](#state-management)
- [Routing & error boundary](#routing--error-boundary)
- [Theme system](#theme-system)
- [Module reference](#module-reference)
  - [`app/`](#app)
  - [`store/`](#store)
  - [`context/`](#context)
  - [`hooks/`](#hooks)
  - [`modules/Auth`](#modulesauth)
  - [`modules/Dashboard`](#modulesdashboard)
  - [`shared/UI` + `shared/components`](#sharedui--sharedcomponents)
  - [`shadecn/`](#shadecn)
- [Chart component anatomy](#chart-component-anatomy)
- [Alert flow](#alert-flow)
- [SEO / PWA assets](#seo--pwa-assets)
- [Scripts](#scripts)

---

## Running locally

```bash
# from repo root
docker compose up mongo redis -d
cd backend && npm install && npm run start:dev   # terminal 1

cd frontend
npm install
cp .env.example .env
npm run dev                                      # terminal 2
```

Default dev URL: `http://localhost:5173` (Vite picks 5174 automatically
if 5173 is taken).

---

## Tech choices

| Concern | Library | Why |
|---|---|---|
| Framework | React 19.2 | New hook rules, resource hooks, better Suspense |
| Build tool | Vite 8 | Fastest DX, native ESM, minimal config |
| Styling | Tailwind CSS 4 | CSS-first `@theme` — variables in one place, no JS config file |
| UI primitives | shadcn/ui (Radix under the hood) | Copy-paste ownership, no runtime cost |
| Global state | Redux Toolkit | Predictable Redux DevTools timeline for streaming ticks |
| Server state | SWR | Declarative fetching + dedupe + retries — perfect for REST |
| Forms | React Hook Form + Zod | Uncontrolled inputs = no re-renders per keystroke |
| Routing | react-router v7 | `errorElement` for per-route boundaries |
| Charts | Recharts 3 | SVG + responsive + zero-dep, good enough for a line chart |
| Realtime | socket.io-client | Backend matches, automatic reconnect |
| Icons | Lucide React | Consistent stroke style |

---

## Project layout

```
frontend/
├── Dockerfile                      nginx static serve + /api/ + /socket.io/ proxy
├── nginx.conf
├── vite.config.ts                  aliases, @tailwindcss/vite plugin
├── tsconfig*.json
├── eslint.config.js
├── .env.example
├── index.html                      SEO meta, OG, theme boot script
├── public/
│   ├── favicon.svg                 branded cyan chart-pulse icon
│   ├── og-image.svg                1200x630 social share preview
│   ├── site.webmanifest            PWA manifest
│   ├── robots.txt
│   └── sitemap.xml
│
└── src/
    ├── main.tsx                    provider stack root
    ├── app.css                     Tailwind 4 @theme + light override
    │
    ├── app/
    │   ├── api/
    │   │   ├── index.ts            Axios instance + interceptors
    │   │   ├── services/           auth / ticker / alert service classes
    │   │   └── types/              IResponse, ITicker, IAlert, etc.
    │   ├── constants/
    │   │   ├── endpoints.ts        EAPI enum mirror of backend routes
    │   │   ├── routes.ts           ERoutes enum for react-router
    │   │   ├── socket-events.ts    ESocketEvents mirror of backend enum
    │   │   └── keys.ts             SWR_KEYS factory + localStorage keys
    │   └── router/
    │       ├── index.tsx           createBrowserRouter + errorElement wiring
    │       └── ProtectedRoute.tsx  auth gate + redirect
    │
    ├── store/
    │   ├── store.ts                configureStore + typed hooks
    │   └── slices/
    │       ├── authSlice.ts        user + access_token
    │       ├── selectedTickerSlice.ts
    │       ├── livePricesSlice.ts  streaming tick state, keyed by symbol
    │       └── triggeredAlertsSlice.ts
    │
    ├── context/
    │   ├── SocketProvider.tsx      singleton socket.io-client instance
    │   ├── ThemeProvider.tsx       light / dark / system + OS listener
    │   └── theme-context.ts        createContext (split for Fast Refresh)
    │
    ├── hooks/                      useTickers, useTickerHistory, useAlerts,
    │                               useAuth, useSocket, useTheme, useTickerSub
    │
    ├── modules/
    │   ├── Auth/
    │   │   └── _pages/             LoginPage, RegisterPage
    │   └── Dashboard/
    │       ├── _layouts/DashboardLayout.tsx
    │       ├── _pages/DashboardPage.tsx
    │       ├── _views/
    │       │   ├── TickerListView.tsx
    │       │   └── PriceChartView.tsx
    │       └── _components/
    │           ├── LiveChart.tsx           Recharts live + history chart
    │           ├── ChartRangeSelector.tsx  1H/1D/1W/1M/1Y/5Y/Custom buttons
    │           ├── CustomRangeModal.tsx    datetime-local picker
    │           ├── TickerRow.tsx
    │           ├── PriceFlash.tsx          400ms green/red flash on change
    │           ├── MobileTickerStrip.tsx   below-lg horizontal nav
    │           ├── AlertBell.tsx           header bell + dropdown
    │           ├── SetAlertModal.tsx       create alert form
    │           ├── AlertToastListener.tsx  bottom-right fire notifications
    │           └── ThemeToggle.tsx         sun/moon header button
    │
    ├── shared/
    │   ├── UI/                     MainInput, Button, MainModal, …
    │   └── components/
    │       └── RouteErrorBoundary.tsx  top-level errorElement
    │
    └── shadecn/                    shadcn/ui primitives (note spelling)
```

---

## Provider stack

Order in `src/main.tsx`:

```tsx
<StrictMode>
  <ThemeProvider>        // must wrap router so <html data-theme="…"> is set early
    <Provider store={store}>
      <SWRConfig value={{ revalidateOnFocus: false, shouldRetryOnError: false, dedupingInterval: 5_000 }}>
        <SocketProvider> // creates singleton socket.io-client once authenticated
          <RouterProvider router={router} />
        </SocketProvider>
      </SWRConfig>
    </Provider>
  </ThemeProvider>
</StrictMode>
```

`ThemeProvider` is outside the router because it flips
`<html data-theme="…">` and that element is shared across routes.
The matching inline script in `index.html` sets the attribute
**before first paint** so there's no flash of the wrong theme
while React boots.

SWR's global defaults disable retries and focus revalidation — the
hooks that need retries (`useTickers`, `useTickerHistory`) opt in
locally so the chart and sidebar can recover from Render cold starts
without triggering global behaviour everywhere else.

---

## State management

**Redux is used for**:

- `authSlice` — current user + token (also mirrored to localStorage)
- `selectedTickerSlice` — which symbol the chart should render
- `livePricesSlice` — the **live tick stream** keyed by symbol. Updated
  on every `price:update` WebSocket event. Chart, ticker rows, and the
  alert preview all read from this slice via granular selectors
  (`useAppSelector(s => s.livePrices.bySymbol[symbol])`) so only the
  components that actually depend on a symbol re-render when that
  symbol's tick arrives.
- `triggeredAlertsSlice` — alerts that fired during this session,
  used by the bell dropdown and the toast.

**SWR is used for**:

- `useTickers` → `GET /tickers`
- `useTickerHistory` → `GET /tickers/:symbol/history`
- `useAlerts` → `GET /alerts`

The split is deliberate: *live ticks belong in Redux* (fire every
500ms, no cache benefit), *REST data belongs in SWR* (cacheable, benefit
from dedupe + retry + `mutate`).

---

## Routing & error boundary

`react-router` v7 with `createBrowserRouter`. Every top-level route
(and the `ProtectedRoute` layout) has
`errorElement: <RouteErrorBoundary />` attached, so any uncaught
render error lands on a branded error page instead of a blank
screen.

```
  /                → Navigate → /dashboard
  /login           → LoginPage               (public)
  /register        → RegisterPage            (public)
  /dashboard       → ProtectedRoute          (auth required)
                       └── DashboardPage
  *                → Navigate → /dashboard
```

**`ProtectedRoute`** reads the Redux auth slice; if there's no token
it redirects to `/login` via `<Navigate>`, otherwise it renders
`<Outlet />`.

**`RouteErrorBoundary`** (`src/shared/components/RouteErrorBoundary.tsx`)
handles two kinds of errors differently:

- `isRouteErrorResponse(error)` — loader/action HTTP failures (404,
  401, 5xx) — shows a status badge and a status-specific message.
- `error instanceof Error` — uncaught render errors — shows the
  message and, in **dev only**, the stack trace in a `<pre>`.

Both cases get a **Reload** button and a **Back to dashboard** link
so the user can't be stranded.

---

## Theme system

Three user-selectable modes: `light`, `dark`, `system` (the default).
The resolved theme is applied to `<html data-theme="…">` and
Tailwind 4 CSS variables re-skin the entire UI.

**`src/app.css`** defines the dark palette inside `@theme { … }` and
the light overrides inside `:root[data-theme='light'] { … }`. The
same Tailwind utility classes (`bg-bg`, `text-text`, `border-border`,
`text-up`, `text-down`, `text-accent`) resolve to different values
based on `data-theme` — zero extra classes in components.

**`ThemeProvider`** (`src/context/ThemeProvider.tsx`):

1. Reads the preference from localStorage (`trading_theme_pref`).
2. Derives the resolved `theme` during render: `preference === 'system' ? systemTheme : preference` — no setState-in-effect.
3. Writes `document.documentElement.setAttribute('data-theme', theme)` in an effect.
4. Listens to `window.matchMedia('(prefers-color-scheme: dark)')` for
   changes. Feature-detects both `addEventListener` and the legacy
   `addListener` so it works on older WebKit.

**`index.html` inline boot script** runs **before** React hydrates
and sets `data-theme` based on the stored preference or the OS
preference, so the user never sees a flash of the wrong theme while
React boots. The boot script and the provider use the same
`(prefers-color-scheme: dark)` media query so they can never
disagree.

**`ThemeToggle`** in the header flips light ↔ dark (dropping out of
`system` follow-mode) via a single button.

---

## Module reference

### `app/`

**`api/index.ts`** — single Axios instance.

- **Request interceptor**: reads the token from localStorage (set by
  `authSlice`) and injects an `Authorization: Bearer` header.
- **Response interceptor**: on 401, clears the token and dispatches a
  logout — ends the session immediately instead of trapping the user
  in a protected route with a dead token.

**`api/services/`** — class-based singleton services
(`tickerService`, `authService`, `alertService`) each `Object.freeze`d
on export. One place per domain for backend calls.

**`api/types/`** — TypeScript interfaces for API payloads
(`IResponse`, `ITicker`, `IPricePoint`, `IAlert`, `TChartRange`, …).

**`constants/endpoints.ts`** — `EAPI` enum mirrors the backend route
paths so all service calls reference the same strings.

**`constants/keys.ts`** — SWR cache key factories + localStorage key
constants. Keep them here so they never drift between writer and
reader.

**`router/`** — see [Routing](#routing--error-boundary) above.

### `store/`

**`store.ts`** — `configureStore` with all slices + typed
`useAppDispatch` / `useAppSelector` hooks.

**Slices**

| Slice | Purpose | Written by |
|---|---|---|
| `authSlice` | `user` + `access_token`, mirrored to localStorage | login/register actions |
| `selectedTickerSlice` | currently active symbol | `TickerRow` onClick |
| `livePricesSlice` | tick state `{ bySymbol: Record<symbol, IPriceTick> }` | `SocketProvider` on `price:update` |
| `triggeredAlertsSlice` | alerts that fired this session + unread counter | `SocketProvider` on `alert:triggered` |

### `context/`

**`SocketProvider`** creates a single `socket.io-client` instance and
exposes it via `useSocket()`. On `price:update` it dispatches to
`livePricesSlice`; on `alert:triggered` it dispatches to
`triggeredAlertsSlice` and mutates SWR's `/alerts` cache so the
dropdown reflects the fired state immediately.

**`ThemeProvider`** — see [Theme system](#theme-system).

### `hooks/`

| Hook | Returns | Under the hood |
|---|---|---|
| `useAuth()` | `{ user, signIn, signOut }` | Redux `authSlice` + localStorage sync |
| `useSocket()` | `{ socket, isConnected }` | Context |
| `useTheme()` | `{ theme, preference, setPreference, toggle }` | Context |
| `useTickers()` | `{ tickers, isLoading, error, refetch }` | SWR |
| `useTickerHistory(symbol, range)` | `{ history, isLoading, error, refetch }` | SWR with retry-on-error |
| `useTickerSub(symbol)` | — (subscribes this component to the symbol's live feed) | Socket.IO `subscribe:ticker` |
| `useAlerts()` | `{ alerts, isLoading, error, create, remove }` | SWR + Axios |

**`useTickerHistory`** is worth calling out — the cacheKey encodes
the range mode so a preset-range fetch doesn't collide with a
custom-range fetch, and retries are enabled locally (the global SWR
config has them off) so the chart recovers from Render cold-starts
without blocking other hooks.

### `modules/Auth`

Two pages: `LoginPage` and `RegisterPage`. Both use React Hook Form +
Zod with shadcn's `Form` wrapper around `MainInput`. On success they
dispatch the auth slice, persist the token, and navigate to
`/dashboard`.

### `modules/Dashboard`

- **`DashboardLayout`** — sticky header (logo, live indicator,
  theme toggle, alert bell, user email, logout) + a `lg:` flex
  split: sidebar (`hidden lg:block w-80`) + `<main>`.

- **`DashboardPage`** — wires the layout and mounts the live-prices
  subscription / auto-select-first-ticker effect *here* so those hooks
  stay mounted regardless of which navigator (desktop sidebar vs
  mobile strip) is visible.

- **`TickerListView`** — desktop sidebar. Skeleton on first load,
  ticker rows after. Each row shows symbol / name / live price
  (with `PriceFlash`) / % change / alert bell.

- **`PriceChartView`** — chart header (symbol, name, big price with
  flash, change badge) + **`ChartRangeSelector`** row + **`LiveChart`**.
  `key={symbol}` remounts the chart on symbol switch so the previous
  series never flashes. Range switches are handled *inside* the chart
  with a crossfade — see [Chart component anatomy](#chart-component-anatomy).

### `shared/UI` + `shared/components`

- **`UI/Button`** — variant (primary / ghost / outline), size, `loading`
  prop that renders a spinner.
- **`UI/MainInput`** — label + input + error slot, extends
  `InputHTMLAttributes` so it accepts `type`, `min`, `max`, `value`,
  `onChange`, etc.
- **`UI/MainModal`** — Radix-backed dialog wrapper.
- **`components/RouteErrorBoundary`** — see
  [Routing & error boundary](#routing--error-boundary).

### `shadecn/`

shadcn/ui primitives — `Form`, `Toast`, `Tooltip`, etc. The folder
is deliberately spelled `shadecn` (not `shadcn`) to match this
project's convention.

---

## Chart component anatomy

**`LiveChart`** is the most complex component. It serves two modes
with the same Recharts `<AreaChart>`:

- **Live (range = `1h`)** — appends every incoming `price:update` to
  the buffer (`MAX_POINTS = 300`), clips the visible data to the
  last `VISIBLE_POINTS = 60` so each new tick takes a meaningful
  fraction of the chart width, and draws a dashed "session open"
  reference line derived from `tick.price - tick.change`.
- **Historical (all other ranges)** — renders the full SWR'd series
  without sliding, and the baseline is the first point of the
  visible window.

**YAxis floor** — `yDomain` is computed from the visible data with a
minimum half-range of 0.4% of the price (`MIN_HALF_RANGE_PCT`). Without
this, a 5¢ wiggle on a $200 stock auto-zooms into a giant visual
wave. Real movement past that threshold expands the bounds with 15%
breathing room.

**Dynamic axis formatters** — `makeAxisFormatter(spanMs)` and
`makeTooltipFormatter(spanMs)` pick hour / day / month+year precision
based on the visible span, so a custom 6-month window automatically
gets month-level ticks without any explicit range check.

**Range transitions** — instead of remounting on range change
(which would kill live subscriptions and flash the skeleton),
`LiveChart` keeps its Redux + SWR bindings and:

1. Watches a stable `rangeKey` string.
2. When it changes, an effect clears `chartData` so the visible area
   goes empty.
3. SWR refetches the new history under the new cacheKey.
4. The seed effect refills `chartData`.
5. A CSS `@keyframes chart-fade-in` on the outer wrapper (`key={rKey}`
   to restart the animation) fades the new series in over 400ms.

The whole flow is smooth because the component itself never
unmounts.

**Loading + error states**
- `chartData.length === 0 && error` → error icon + "Failed to load history"
- `chartData.length === 0` → centered `<Loader2>` spinner (chosen over
  the old SVG shimmer skeleton per user feedback)

**Theme palette duplication** — Recharts cannot consume Tailwind
classes or CSS variables (it expects raw hex strings), so
`CHART_PALETTE.dark` / `CHART_PALETTE.light` mirror the relevant
colors from `app.css` and the component switches on `useTheme()`.

---

## Alert flow

1. User clicks the bell icon on a `TickerRow` → parent renders
   `SetAlertModal` (conditionally mounted so each open is a fresh
   form).
2. Modal pre-fills the threshold at `currentPrice * 1.01` so users
   start with an alert that can actually fire.
3. `useWatch` on the price input drives an inline "direction vs
   price" hint — if the user picks `above` but enters a price
   already below current, a warning explains that the alert would
   never fire.
4. Submit → `useAlerts().create()` → POST → SWR `mutate` so the bell
   dropdown updates immediately.
5. When the backend's `AlertService` detects a crossing on a tick
   it emits `alert:triggered` over Socket.IO. The `SocketProvider`
   catches it, dispatches to `triggeredAlertsSlice`, and mutates
   SWR's `/alerts` cache so the "Watching" row becomes a "Triggered"
   row.
6. **`AlertToastListener`** (mounted once in the dashboard layout)
   derives visible toasts from the triggered alerts slice + a
   local "dismissed" `Set`. Each fire pops a bottom-right toast for
   a few seconds then slides out.

---

## SEO / PWA assets

`public/` contains everything needed for decent search and
social-share previews:

| File | Role |
|---|---|
| `favicon.svg` | branded cyan chart-pulse icon on dark square |
| `og-image.svg` | 1200×630 social share preview with wordmark + chart + stat pills |
| `site.webmanifest` | PWA install metadata — name, theme color, icons, finance category |
| `robots.txt` | `Allow: *` + sitemap reference |
| `sitemap.xml` | `/`, `/login`, `/register` |

`index.html` has the full SEO block: title, description, keywords,
canonical, Open Graph (Facebook/LinkedIn/Slack/Discord), Twitter
card, JSON-LD `WebApplication` schema, Apple PWA hints, dark/light
`theme-color`, preconnect to the Render backend, and a `<noscript>`
fallback.

> **Note on Open Graph**: `og-image.svg` renders correctly on Twitter,
> Discord, iMessage, and most modern crawlers. Facebook and LinkedIn
> do **not** render SVG — for pixel-perfect previews everywhere you'd
> export the SVG to a 1200×630 PNG and swap the `og:image` URL in
> `index.html`.

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | `tsc -b && vite build` → writes to `dist/` |
| `npm run lint` | `eslint .` (project-wide, 0 errors) |
| `npm run preview` | Serve the production build locally |
