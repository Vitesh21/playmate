# Playmate

> **"Your court, your kit, one tap."** — Playmate combines **Playo-style court booking** with **District-style on-demand venue essentials**
> (rackets, shuttles, grips) delivered to the court on arrival *or* mid-game via QR scan.
> Monorepo · React Native (Android + future iOS) + NestJS + Supabase PostgreSQL + Razorpay.

---

## 🛠 Tech Stack Summary

| Layer | Technology | Why |
|---|---|---|
| **Database** | **PostgreSQL 15+** on **Supabase** (Managed, with PostGIS later for "near me") | ACID compliance, PostGIS for GIS search, Supabase Storage for images, Pooler for Serverless cold-starts |
| **ORM + SQL migrations** | **Drizzle ORM** (TypeScript SQL builder) with `drizzle-kit generate` | Zero magic, colocated TypeScript types, fastest Node.js ORM — see [apps/api/src/db/schema](apps/api/src/db/schema) |
| **Auth — Authentication** | **Supabase Auth** (JWT + RLS) | Email/password, Magic-link OTP, Phone OTP, Google OAuth, Apple OAuth — same JWT consumed by both API and Mobile |
| **Auth — Authorization** | RBAC via `user_role` enum on `users` table: `USER` · `VENUE_OWNER` · `SELLER` · `ADMIN` + route-level `AuthGuard` (NestJS) + **Postgres RLS policies** per row | Single source of truth at DB layer, service-role key only inside NestJS trusted backend |
| **API Backend** | **NestJS 10 + Express** · DTO validation via `nestjs-zod` + `@playmate/validation` shared schemas | Modular services (bookings, venues, payments, venue-essentials, on-demand-orders, carts, products) |
| **Mobile App (Android)** | **Expo SDK 51 · React Native 0.74 · TypeScript** | One codebase for Android (today) + iOS (later) with Expo OTA updates, SecureStore for JWTs, Metro monorepo config |
| **Navigation** | React Navigation — bottom tabs × 4 native stacks (Play · Shop · Bookings · Profile) · typed params | Native-feeling back-stack, deep-linkable routes |
| **State (client)** | **Zustand** for UI stores (auth/cart/app/theme) + **TanStack Query v5** for all server/cached state | Colocation, query invalidation, optimistic updates, stale-while-revalidate |
| **Payments** | **Razorpay Standard Checkout** · Orders API · Webhook `payment.captured` → booking confirmation | India UPI, cards, wallets, net-banking. Payment records linked to EITHER `orderId` OR `bookingId` (single generic payments table) |
| **Email** | **Resend** · transactional (booking confirm, password reset, receipt) | 100/day free tier, good deliverability |
| **Forms (mobile)** | **react-hook-form** + zod resolver via `@playmate/validation` shared zod DTOs | Validation runs on client AND server with the SAME schema file |
| **Build & Run** | **Turborepo** (task runner) + **pnpm** workspaces | Cache-aware build graph, hoisted `node_modules`, single `pnpm install` for monorepo |

---

## 🗂 Monorepo Structure

```
playmate/
├── apps/
│   ├── api/                NestJS + Drizzle + Razorpay backend
│   │   ├── src/
│   │   │   ├── auth/                JWT validation → Supabase Auth service, auth.controller
│   │   │   ├── common/              AuthGuard, BaseService, Email, Razorpay, Supabase
│   │   │   ├── bookings/            court booking + venue-essentials attachment
│   │   │   ├── venues/              venues + courts + court-slots
│   │   │   ├── venue-essentials/    pro-shop catalog per venue (NEW)
│   │   │   ├── on-demand-orders/    mid-game court-QR essentials orders (NEW)
│   │   │   ├── cart/ · orders/ · products/ · categories/
│   │   │   ├── inventory/ · payments/ · reviews/ · notifications/ · users/
│   │   │   ├── admin/               ADMIN + VENUE_OWNER scoped endpoints
│   │   │   ├── health/              /health liveness/readiness probes
│   │   │   └── db/schema/           18 Drizzle PostgreSQL tables + 2 NEW (venue-essentials, booking-essentials, on-demand-orders)
│   │   └── test/             Jest route tests (NEW)
│   └── mobile/             Expo · React Native Android app (iOS later)
│       └── src/
│           ├── features/           Feature-sliced: auth / venues / bookings / venue-essentials / products / cart / orders / profile
│           │   └── venue-essentials/  EssentialCard + RecommendationRail + TanStack hooks
│           └── shared/             Reusable, feature-agnostic layer
│               ├── components/ui/  Design system (Button/Input/Card/Badge/States + FormInput)
│               ├── theme/          Forest-teal LIGHT + DARK minimal themes · ThemeProvider
│               ├── navigation/     4 tab stacks, 20+ typed routes
│               ├── services/       axios (interceptor, toast), Supabase, SecureStore, payments
│               ├── store/          zustand: auth, cart, app
│               ├── hooks/          useAppState, useToggle, useDimensions
│               └── utils/          formatCurrency (₹), formatDate, status→badge
└── packages/
    ├── types/            Shared domain types + BOOKING/ORDER/PAYMENT enums + NEW
    │                     VenueEssential / BookingEssential / OnDemandOrder + full typed ROADMAP
    ├── validation/       Zod DTOs shared by BOTH mobile AND NestJS API
    │                     + NEW venueEssentialCreateSchema / attachEssentialsSchema / onDemandCreateSchema
    └── config/           Zod-validated env vars + operational knobs (booking expiry, GST %)
```

---

## 🔐 Authentication & Authorization — Full Explanation

### A. AUTHENTICATION (Who are you?)

We use **Supabase Auth** as the single Identity Provider. Every sign-in flow returns a JWT (`access_token`).

| Flow | How it works |
|---|---|
| **Email + password** | `supabase.auth.signInWithPassword()` → JWT → Expo SecureStore → sent as `Authorization: Bearer <token>` on every API call |
| **Phone OTP** (India) | `signInWithOtp({ phone })` → 6-digit SMS via Supabase → verifyOtp → JWT |
| **Google OAuth** | Expo `expo-auth-session` → Google redirect → Supabase exchange → JWT |
| **Magic link** | Email "tap to login" link → no password needed |

**Token lifecycle**: JWT expires in 1h by default. Supabase SDK uses `refresh_token` (exchanged in background by `supabase.auth.onAuthStateChange`) to get a fresh access token. Mobile restores session from SecureStore on cold launch (`useAuthStore.restoreSession`).

### B. AUTHORIZATION (What can you do?) — **Two layers, always.**

1. **NestJS route guard** — [auth.guard.ts](apps/api/src/common/auth.guard.ts)
   - Verifies JWT signature against Supabase `jwt_secret` → extracts `sub` (userId) and `user_role`
   - Controller routes decorated with `@Roles(UserRole.ADMIN, UserRole.VENUE_OWNER)`
   - Rejects 401 if missing/invalid token, 403 if role mismatch

2. **Postgres Row-Level Security policies** (Supabase dashboard)
   - `SELECT` on `users`: users can READ their own row
   - `bookings`: users can only see rows where `user_id = auth.uid()`
   - VENUE_OWNER can CRUD `venues` where `owner_id = auth.uid()`
   - SELLER can CRUD `products` where `seller_id = auth.uid()`
   - Even if NestJS has a bug, the DB will never leak another user's bookings.

### C. RBAC Roles — [packages/types/src/index.ts `UserRole`](packages/types/src/index.ts#L95-L100)

| Role | Permissions |
|---|---|
| `USER` | Default. Book courts, order essentials/products, manage own profile/orders |
| `VENUE_OWNER` | Manage own venues · courts · slots · essentials pro-shop. View bookings of their venues. Mark essentials delivered/returned. |
| `SELLER` | Manage own product catalog · variants · inventory. View own product orders/reviews. |
| `ADMIN` | Superuser. All CRUD, impersonate users, financial reports, role promotion. |

**Never ship the `SUPABASE_SERVICE_ROLE_KEY` to the mobile app.** It only exists inside `apps/api` NestJS `.env`.

---

## 💾 Database — Full Schema (18 + 3 NEW tables)

PostgreSQL on Supabase. All tables use `UUID` primary keys + `created_at` / `updated_at`.

### Core tables (already present)

| Table | Purpose |
|---|---|
| `users` (synced 1:1 with `auth.users`) | profile + `user_role` enum |
| `sports` | Sport taxonomy (Badminton, Football, Basketball, …) |
| `venues` → FK sport_id, owner_id | Facility with address, lat/lng PostGIS later, operating_hours JSONB |
| `courts` → FK venue_id | Bookable court inside venue (surface, hourly rate) |
| `court_slots` → FK court_id · UNIQUE(court, date, start, end) | Actual bookable time slots. `is_available` flipped on booking creation |
| `bookings` → FK user_id, court_slot_id, payment_id · status enum | PENDING → CONFIRMED / EXPIRED / CANCELLED / REFUNDED |
| `categories` (products) · parent_id = self-referential tree |
| `products` → FK category_id, seller_id | E-commerce listing |
| `product_variants` → FK product_id · `sku` UNIQUE | Sellable SKU |
| `inventory` → FK variant_id · (availableToSell = quantity - reserved) |
| `cart` / `cart_items` | One cart per user |
| `orders` / `order_items` | Shop checkout + address snapshot, tax/GST/shipping |
| `payments` → generic FK (order_id OR booking_id) | Razorpay transaction_id + gateway_response JSONB |
| `reviews` → XOR(venue_id, product_id) + isVerified flag |
| `notifications` → user_id · push / email payload JSONB |

### NEW Tables (Venue Essentials — your "forgot your racket" feature) — added in [apps/api/src/db/schema](apps/api/src/db/schema)

| Table | Purpose |
|---|---|
| `venue_essentials` | Pro shop catalog per venue. Type: `RENT / SALE / ADDON`. Pricing model `PER_HOUR / PER_BOOKING / FIXED`. stock qty, max per booking, tags, categories. |
| `booking_essentials` | Lines attached to a booking (price snapshot at checkout, qty, duration, line_total, fulfillment_status PENDING/DELIVERED/RETURNED/DAMAGED) — rolled into booking total, ONE combined Razorpay payment. |
| `on_demand_orders` + `on_demand_order_items` | Mid-play QR scan → "Court 3 needs 2 shuttles + water". Status REQUESTED→PREPARING→DELIVERED. Staff tablet 1-tap fulfillment. |

### Enums (Postgres native)

`booking_status`, `payment_status`, `payment_method`, `order_status`, `user_role`, **NEW** `essential_type`(RENT/SALE/ADDON), `essential_pricing_model`(PER_HOUR/PER_BOOKING/FIXED).

---

## 🚀 Quickstart (Local Dev)

### Prerequisites
- Node 18.17+, **pnpm 9**
- Docker with the Compose plugin
- Supabase project credentials for authentication and storage

### 1. Install dependencies

Run this once from the repository root. pnpm installs all workspace packages and links the local `@playmate/*` packages:

```bash
pnpm install
```

### 2. Configure the API

```bash
cp .env.example .env
```

Update the root `.env` with your Supabase values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-secret-or-service-role-key
```

The service-role/secret key is backend-only. Never put it in the mobile app or commit `.env`. Razorpay should use test keys for local development. `RESEND_API_KEY` may be a placeholder until email is configured.

### 3. Start local PostgreSQL

The included [docker-compose.yml](docker-compose.yml) starts PostgreSQL on `localhost:54322`, matching `.env.example`:

```bash
pnpm db:up
pnpm db:generate
pnpm db:migrate
```

Useful database commands:

```bash
pnpm db:logs
pnpm db:down
```

This Docker service provides PostgreSQL only. Supabase Auth and Storage still use the configured Supabase project.

### 4. Run the API

Keep the database running, then start the API in another terminal:

```bash
pnpm --filter @playmate/api dev
```

The API listens on `http://localhost:3001` because `API_PORT=3001` is set in `.env`.

Verify it:

```bash
curl http://localhost:3001/health
```

Development API documentation is available at [http://localhost:3001/docs](http://localhost:3001/docs). Swagger is disabled when `NODE_ENV=production`.

### 5. Run the mobile app later

The mobile app uses Expo, not React Native CLI:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

For an Android emulator, set `EXPO_PUBLIC_API_URL=http://10.0.2.2:3001` in `apps/mobile/.env`, then run:

```bash
pnpm --filter @playmate/mobile start
```

Press `a` to open the Android emulator, or scan the QR code with Expo Go.

### Scripts (from repo root)
```bash
pnpm build                     # turbo build: packages/types → validation → config → api → mobile export
pnpm typecheck                 # tsc --noEmit across whole workspace
pnpm lint                      # eslint
pnpm test                      # Jest API route tests (NEW)
pnpm --filter @playmate/api dev
pnpm --filter @playmate/mobile android
```

---

## 📋 Feature Roadmap (4 Phases · 25 features)

Typed directly in code: [packages/types/src/index.ts → `ROADMAP[]`](packages/types/src/index.ts#L573-L647). Summary:

- **Phase 1 / MVP**: Auth, Venue browse, Slot booking, My bookings
- **Phase 2**: 🎾 **Essentials Upsell**, Combined payment, Arrival QR staff tablet, Near-me, Reminders
- **Phase 3**: Mid-game on-demand QR, Off-peak deals, Play+Kit bundles, Referral, Play badges, Wallet UPI autopay, Playmate Prime membership, Venue owner occupancy dashboard
- **Phase 4**: KitBag subscription, Leaderboards, **Find-a-Player** (post "need 2 doubles players"), B2B Pro Shop marketplace (Yonex/Li-Ning wholesale to venues)

---

## 🧪 Tests

```bash
# Run API route tests
pnpm --filter @playmate/api test
```

See [apps/api/test/README.md](apps/api/test/README.md) for test plan. Tested endpoints in this PR:
- `GET /health` — liveness
- `POST /auth/login` happy + invalid password 401
- `GET /sports` list
- `GET /venues?city=…&sportId=…` filters
- `GET /venues/:id` → courts nested
- **NEW** `GET /venue-essentials/venue/:venueId` catalog + recommendations
- **NEW** `POST /bookings/:id/essentials` (attach to booking, validates stock + maxPerBooking, rolls line totals into booking total)
- **NEW** `POST /on-demand-orders` (mid-game QR order) → inventory decrement

---

## 🔒 Production Security Checklist

1. **Enable RLS on ALL tables** in Supabase dashboard. (Auth guard is defense-in-depth; RLS is the real moat.)
2. Rotate `SUPABASE_SERVICE_ROLE_KEY` every 6 months; never paste it anywhere but NestJS `.env`.
3. Razorpay webhook signing secret validation in `payments.controller.ts` before marking a booking PAID.
4. Rate-limit `/auth/*` endpoints at Supabase edge + at NestJS via `@nestjs/throttler`.
5. DB backups (Supabase does Point-in-Time Recovery automatically on paid tier).
6. Expo OTA channels: `production` → users; `staging` → internal.

---

## 📚 Also see

- [HOSTING.md](./HOSTING.md) — Step-by-step: Render.com API, Supabase setup, Expo OTA, Play Store release, Razorpay webhook, Email, Domains/SSL.
- [packages/validation/src/index.ts](packages/validation/src/index.ts) — Shared zod DTOs (one source of truth for client + server validation).
- [apps/api/test/routes/](apps/api/test/routes) — Jest route tests.
