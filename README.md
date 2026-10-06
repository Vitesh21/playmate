# Playmate — Sports Platform

> **Playo + Amazon, but completely focused on sports.**
> Book sports venues, join games, and buy quality equipment — all in one place.

---

## 📦 Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) + TypeScript | SSR/SSG, RSC, React familiarity |
| **UI** | Tailwind CSS + shadcn/ui-style components | Design tokens, zero-runtime, copy-paste friendly |
| **Backend** | NestJS 10 + TypeScript + REST | Modular, opinionated, typed DI |
| **Database** | PostgreSQL on Supabase | Free tier, extensions, managed |
| **ORM** | Drizzle ORM | SQL-first, type-safe, edge-ready |
| **Authentication** | Supabase Auth | Email + OTP + social, managed JWT |
| **Storage** | Supabase Storage | Public / signed URLs for images |
| **Payments** | Razorpay | INR native, UPI + cards, webhooks |
| **Email** | Resend | Transactional, React email templates |
| **Search** | PostgreSQL FTS + pg_trgm → Meilisearch later | Zero extra infra on day 1 |
| **Cache** | None (MVP) → Upstash Redis later | Pay only what you need |
| **Deployment** | Next.js → Vercel · NestJS → Render · DB → Supabase | Near-zero cost for MVP |
| **Repository** | GitHub | — |
| **Monorepo** | pnpm 9 + Turborepo | Fast installs, caching, shared types |

---

## 🏗️ Architecture — Modular Monolith

```
                  ┌──────────────────────┐
                  │      Next.js 14      │
                  │   apps/web (:3000)   │
                  │  Tailwind + shadcn   │
                  └──────────┬───────────┘
                             │
                         REST /api
                             │
                  ┌──────────▼───────────┐
                  │      NestJS 10       │
                  │   apps/api (:3001)   │
                  │   15 Module domains  │  ←─ Play & Shop share one binary
                  └──────────┬───────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
   PostgreSQL            Storage              Razorpay
   (Supabase)            (Supabase)            Payments
   Drizzle schema         3 Buckets            Webhooks
```

**Keep these two domains separate even inside one binary.**

### 🏟️ PLAY Engine
```
Sports → Venues → Courts → CourtSlots → Bookings → Payment → Email
Example: Badminton → Smash Arena → Court 3 → 6 PM → ₹500 → CONFIRMED
```

### 🛒 SHOP Engine
```
Categories → Products → ProductVariants → Inventory → Cart → Orders → Payment → Delivery
Example: Badminton → Rackets → Yonex Astrox 4U/G5 → Stock → Cart → Order
```

---

## 📁 Project Structure

```
playmate/
├── apps/
│   ├── web/                 # Next.js 14 frontend (App Router)
│   │   ├── src/
│   │   │   ├── app/         # Pages + layouts + globals.css
│   │   │   ├── components/  # ui/* + layout/* (Navbar, Footer)
│   │   │   └── lib/         # supabase client/server, api, utils, db.types
│   │   ├── tailwind.config.js
│   │   ├── next.config.js
│   │   └── tsconfig.json
│   │
│   └── api/                 # NestJS backend
│       ├── src/
│       │   ├── main.ts              # Entry → :3001, /api prefix, Swagger /docs
│       │   ├── app.module.ts        # Imports all 17 modules
│       │   ├── common/              # Supabase, Razorpay, Resend, Guards, BaseService
│       │   ├── db/                  # Drizzle module + migration runner
│       │   │   └── schema/          # 15 tables + 6 enums (see Database section)
│       │   ├── health/              # GET /api/health
│       │   ├── auth/                # Supabase signup/login/logout/me/reset
│       │   ├── users/               # CRUD + upsert from auth
│       │   ├── sports/              # CRUD + slug + search
│       │   ├── venues/              # Search (sport/city/price/slot) + courts
│       │   ├── courts/              # CRUD + slots (single + bulk create)
│       │   ├── bookings/            # ⚠️ Transactional: PENDING → CONFIRMED/EXPIRED
│       │   ├── categories/          # Hierarchical parentId + tree view
│       │   ├── products/            # Search + variants + sort + filter
│       │   ├── inventory/           # Upsert + reserve/release per variant+warehouse
│       │   ├── cart/                # Auto-create cart + add/update/remove
│       │   ├── orders/              # ⚠️ Transactional checkout + status lifecycle
│       │   ├── payments/            # Razorpay webhook HMAC → auto-confirm
│       │   ├── reviews/             # Products & venues, updates avg rating
│       │   ├── notifications/       # Per user, mark read + unread count
│       │   └── admin/               # Dashboard stats
│       ├── drizzle.config.ts
│       └── tsconfig.json
│
├── packages/                 # Internal packages, published via pnpm workspaces
│   ├── types/                # Core domain types + enums
│   ├── validation/           # Zod schemas for every request
│   └── config/               # Zod env schema + app constants
│
├── package.json              # Workspace root
├── pnpm-workspace.yaml       # apps/* + packages/*
├── turbo.json                # Build pipelines
├── tsconfig.json             # Shared TS + path aliases
├── .prettierrc
├── .env.example
├── pnpm-lock.yaml
└── README.md
```

---

## 🗄️ Database — 15 Tables, 6 Enums

All models live in `apps/api/src/db/schema/`.

### Enums

| Enum | Values |
|---|---|
| `user_role` | USER, ADMIN, VENUE_OWNER, SELLER |
| `booking_status` | PENDING, CONFIRMED, EXPIRED, CANCELLED, REFUNDED |
| `payment_status` | PENDING, PAID, FAILED, REFUNDED |
| `payment_method` | RAZORPAY |
| `order_status` | PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED, REFUNDED |
| `notification_type` | BOOKING_CONFIRMED, BOOKING_REMINDER, ORDER_CONFIRMED, ORDER_SHIPPED, ORDER_DELIVERED, PAYMENT_SUCCESS, PAYMENT_FAILED, GENERAL |

### Core Entity Graph

```
User
 ├── Bookings ──── Court ──── Venue ──── Sport
 │                    └── CourtSlots (UNIQUE court+date+start+end)
 ├── Orders  ──── OrderItems ──── ProductVariant ──── Product ──── Category
 │      │                                               │
 │      └── Payment ───────────────────────────────────┘ (or from Booking)
 │
 ├── Reviews (venueId XOR productId)
 └── Notifications
```

Key constraint design:
- **court_slots** has `UNIQUE (court_id, date, start_time, end_time)` to prevent duplicate slots
- **product_variants** has `UNIQUE sku`
- **inventory** has `UNIQUE (variant_id, warehouse)` so you can track stock per WH
- **JSONB** used for venue `operating_hours`, `amenities`, `images` and order `shipping_address` / `billing_address`

---

## 🔁 Booking Engine (Critical Path)

Double-bookings are prevented with **PostgreSQL row-level locking + unique constraints**.

```
User selects slot
       │
       ▼
BEGIN transaction
  SELECT ... FROM court_slots
    WHERE id = X AND is_available = true
    FOR UPDATE SKIP LOCKED        ← 2nd user gets 0 rows, not a blocked wait
  if (not found) → Conflict
  INSERT bookings (PENDING, expiresAt = now + 15 min)
  UPDATE court_slots SET is_available = false
  INSERT payments (PENDING, transaction_id = rzp_order.id)
  CALL razorpay.orders.create(amount * 100)
COMMIT
       │
       ▼
Razorpay checkout UI
       │
       ├─── payment.captured webhook ───► booking.CONFIRMED + payment.PAID
       │                                      + Send booking confirmation email
       │
       └─── time passes (cron /api/bookings/expire-pending)
             ▼
          bookings.EXPIRED + court_slots.is_available = true
```

Cancel path → same row lock + flip slot back to available + booking.CANCELLED.

---

## 🛒 Checkout Engine (Critical Path)

```
POST /api/orders/checkout (AuthGuard)
       │
       ▼
BEGIN
  SELECT cart FOR UPDATE
  SELECT cart_items + product_variants JOIN
  SELECT inventory FOR UPDATE where variant_id in (...)
  foreach item:
    if (quantity - reserved < requested) → 400
    UPDATE inventory reserved += qty, quantity -= qty
  subtotal = Σ(variant.price × qty)
  tax = subtotal × 18%
  shipping = (subtotal >= 999 ? 0 : 49)
  total  = subtotal + tax + shipping - discount
  INSERT orders (PENDING, addresses JSONB)
  INSERT order_items (snapshot unit_price / total_price)
  DELETE cart_items
  CREATE razorpay order → INSERT payments (PENDING)
COMMIT → return { order, payment, razorpayOrder }
       │
       ▼
razorpay webhook payment.captured → orders.CONFIRMED + payments.PAID
```

---

## 🔌 Integrations

### Supabase Auth
- `POST /api/auth/signup` → creates Supabase user + auto-upserts `users` table row (id = auth uid)
- `POST /api/auth/login` → returns `session.access_token`
- Every subsequent call: `Authorization: Bearer <token>` → **AuthGuard** calls `supabase.auth.getUser(token)` → attaches `req.user`
- **RolesGuard** (`@UseGuards(new RolesGuard(['ADMIN']))`) checks `req.user.role`

### Supabase Storage (3 buckets)
| Bucket | Purpose |
|---|---|
| `venue-images` | Venue cover + gallery, court images |
| `product-images` | Product gallery, variant option images |
| `user-avatars` | User profile avatars |

File upload endpoint pattern: `SupabaseService.uploadFile(bucket, path, buffer, contentType)` → returns `getPublicUrl()`.

### Razorpay
- Amount in **paise** (×100)
- Receipt prefix `PMT_BKG_<id8>` / `PMT_ORD_<id8>` per config
- **Webhook** at `POST /api/payments/razorpay/webhook`
  - Computes HMAC-SHA256 over raw body using `RAZORPAY_KEY_SECRET` → matches `x-razorpay-signature`
  - `payment.captured` / `order.paid` → flip booking/order to CONFIRMED + payment to PAID
  - `payment.failed` → flip payment.FAILED (slot released later by expiry cron)

### Resend
- From: `Playmate <noreply@playmate.in>` (verify domain once in Resend dashboard)
- `EmailService.sendBookingConfirmation` / `sendOrderConfirmation` wrappers + generic `send(to, subject, html)`

---

## 🚀 Getting Started — Local Development

### Prerequisites
- Node.js ≥ 18.17 (recommend 20.x LTS)
- pnpm 9 (`corepack enable && corepack prepare pnpm@9.0.0 --activate`)
- Docker (for Supabase local stack) OR a remote Supabase project
- A Razorpay test-mode key pair (free from dashboard)
- A Resend API key (free tier)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# then edit .env:
#   DATABASE_URL              → from Supabase settings → Database
#   NEXT_PUBLIC_SUPABASE_URL  → Supabase Project URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   SUPABASE_SERVICE_ROLE_KEY
#   RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET (test mode)
#   RESEND_API_KEY
```

### 3. Run Database Migrations
```bash
cd apps/api
pnpm db:generate     # reads src/db/schema → writes SQL to ./drizzle/
pnpm db:migrate      # runs migrations against DATABASE_URL
# Alternative for quick prototype: pnpm db:push (no migration history)
cd ../..
```

### 4. Start Dev Servers (parallel via Turborepo)
```bash
pnpm dev
#  🚀 Frontend:  http://localhost:3000
#  🚀 API:       http://localhost:3001
#  📖 Swagger:   http://localhost:3001/docs
```

### 5. Individual Scripts
```bash
pnpm build            # build web + api (cached via turbo)
pnpm typecheck        # run tsc --noEmit in all workspaces
pnpm lint             # eslint
pnpm format           # prettier write
pnpm --filter api db:studio     # Drizzle Studio browser GUI
pnpm --filter api db:migrate    # Run migrations from workspace root
```

---

## 🧭 Development Roadmap

### ✅ Phase 1 — Foundation (COMPLETE)
- [x] Monorepo + pnpm/Turborepo + shared types/validation/config packages
- [x] Next.js 14 App Router + Tailwind + homepage skeleton
- [x] NestJS modular API (15 domains) + Swagger /docs
- [x] Drizzle PostgreSQL schema (15 tables, 6 enums)
- [x] Supabase Auth + Storage services wired
- [x] Razorpay order + webhook verification + service
- [x] Resend Email service wrappers
- [x] Transactional Booking engine with row locks + expiry
- [x] Transactional Orders / Checkout + inventory reservation
- [x] Reviews, Notifications, Admin stats

### 🎾 Phase 2 — Playo (NEXT)
- [ ] Venue listing page with filters (sport, city, distance, amenities)
- [ ] Venue detail: gallery, amenities, operating hours, price card
- [ ] Interactive slot picker (calendar + hourly grid)
- [ ] Booking summary → Razorpay checkout redirect
- [ ] "My Bookings" page: Upcoming / Past / Cancelled tabs
- [ ] Cron job (Vercel cron or bull) to call `/api/bookings/expire-pending`
- [ ] Post-booking review flow with verified purchase badge
- [ ] Admin: Create Venue → Add Courts → Bulk Generate Weekly Slots form

### 🛍️ Phase 3 — Amazon (NEXT + 1)
- [ ] Category nav → product listing with facet filters (price, size, color, brand)
- [ ] Product detail: variant picker, images, reviews, related
- [ ] Cart drawer / Cart page, quantity stepper, recommended products
- [ ] Checkout flow: Address → Shipping → Payment → Order Confirmed
- [ ] "My Orders" page + tracking
- [ ] Admin: Category tree editor, Product CRUD with variant matrix, inventory adjust
- [ ] Returns & refunds hook → flip order/booking to REFUNDED

### 🤝 Phase 4 — Sports Community
- [ ] User profiles: Sports, Skill level (Beginner → Pro)
- [ ] "Create Game" (date/time/sport/court/skill cap) + invite link
- [ ] "Find Players" → list of open games by city + sport
- [ ] Join game → reserved player spot → group check-in at venue
- [ ] Friending / chat (Supabase Realtime or Pusher later)

---

## 🚢 Deployment — Recommended Free / Low-Cost Path

| Service | Provider | Notes |
|---|---|---|
| **Frontend** | Vercel Hobby | Auto-deploy from GitHub. Hobby = non-commercial; switch to Cloudflare Pages for commercial launch |
| **Backend** | Render Free/Starter | Web Service from GH + Dockerfile (TODO). Free tier spins down → upgrade to $7/mo for always-on |
| **PostgreSQL** | Supabase Free | 500 MB DB, 1 GB storage. Upgrade to Pro ($25/mo) as you grow |
| **Images** | Supabase Storage | 1 GB free, same project as DB |
| **Emails** | Resend Free tier | 3k emails/day forever |
| **Payments** | Razorpay Standard | 2% + GST per txn, no monthly fee |
| **Domain** | Cloudflare / Namecheap | Point `playmate.in` A/CNAME → Vercel + Render |

CI/CD (later): GitHub Actions → lint + typecheck on PR, deploy Vercel/Render preview.

---

## 🔒 Security Checklist (Before Launch)
- [ ] Supabase RLS policies on every table (currently API uses service_role bypass)
- [ ] AuthGuard + RolesGuard on every non-public endpoint (add `@Public()` decorator)
- [ ] Rate limiting (NestJS ThrottlerModule) on auth, bookings, checkout
- [ ] CORS whitelist exact origins in prod
- [ ] Validated `Referer` + `Origin` on Razorpay webhook endpoint
- [ ] `HttpOnly` + `Secure` cookies if using session instead of Bearer
- [ ] CSP headers + `next/headers` in frontend layout

---

## 📘 API Highlights

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | liveness |
| POST | `/api/auth/signup` / `/login` / `/logout` | Supabase auth |
| GET | `/api/auth/me` | current user (Bearer) |
| GET | `/api/sports?search=` | list active sports |
| GET | `/api/venues?sportId=&city=&date=&startTime=&endTime=&minPrice=&maxPrice=` | search venues with availability filter |
| GET | `/api/venues/slug/:slug` | venue by slug |
| GET | `/api/venues/:id/courts` / `/:id/slots?date=` | courts and available slots |
| POST | `/api/courts/:id/slots/bulk` | batch generate weekly slots (Admin) |
| POST | `/api/bookings` | create PENDING booking → returns Razorpay order |
| POST | `/api/bookings/:id/confirm` | manual confirm (webhook does this) |
| DELETE | `/api/bookings/:id` | cancel + flip slot available |
| POST | `/api/bookings/expire-pending` | cron endpoint |
| GET | `/api/categories/tree` | hierarchical nav tree |
| GET | `/api/products?categorySlug=&minPrice=&maxPrice=&brand=&sortBy=` | search + sort products |
| POST | `/api/cart/items` / PATCH / DELETE | cart operations |
| POST | `/api/orders/checkout` | ⚠️ transactional checkout → Razorpay order |
| POST | `/api/payments/razorpay/webhook` | Razorpay HMAC-signed webhook |
| GET | `/api/bookings/my` / `/api/orders/my` / `/api/notifications` | user data |
| GET | `/api/admin/stats` | overview dashboard |

Full Swagger/OpenAPI: `http://localhost:3001/docs` when running.

---

## 💡 Design Principles

1. **One backend, one DB, no microservices.** You will know when you need to split.
2. **Modular boundaries are the future service lines.** The `bookings/` folder becomes the bookings microservice by copying one folder.
3. **Every write that spans two tables is a transaction.** (See bookings.service and orders.service.)
4. **Prefer row-level locks over app-level "check then write".** The DB is the source of truth for availability.
5. **Idempotent webhooks.** Razorpay events can redeliver; handlers must survive being called twice with the same payload.
6. **Zod at every boundary.** User input → API; env vars → config; webhook payloads → signature + shape.

---

## 🤝 Contributing

```bash
# 1. Fork & clone
# 2. Feature branch off main
git checkout -b feat/venue-slots-calendar
# 3. Work
pnpm dev
# 4. Verify
pnpm typecheck && pnpm lint
# 5. Commit (conventional)
git commit -m "feat(venues): weekly slot generator UI"
# 6. Open PR
```

Conventional commit prefixes: `feat / fix / docs / refactor / perf / test / chore / ci`.

---

## 📄 License

MIT © Playmate
