# Playmate · Hosting Guide

> This document walks through a complete **production deployment** for every part of Playmate:
> NestJS API (backend), PostgreSQL (Supabase), Expo React Native mobile app (Android Play Store + future iOS App Store), and payments/email integrations.

---

## 🧱 Hosting Architecture Overview

```
                    ┌────────────────────────────────────────────────────┐
                    │                   PLAYMATE USERS                  │
                    │                                                    │
                    │  ┌────────────────┐        ┌──────────────────┐   │
                    │  │  Android App   │        │ Future iOS App   │   │
                    │  │  (Expo Go or   │        │ (same codebase)  │   │
                    │  │  Play Store)   │        │ (App Store)      │   │
                    │  └───────┬────────┘        └────────┬─────────┘   │
                    │          │ HTTPS                    │             │
                    │          │ (Expo API calls +        │             │
                    │          │  OTA update pull)        │             │
                    └──────────┼──────────────────────────┼─────────────┘
                               │                          │
                               ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            CLOUD (Render / Supabase / Expo)                         │
│                                                                                     │
│  ┌─────────────────────┐      ┌──────────────────────────┐    ┌─────────────────┐  │
│  │  API — Render.com   │      │  Database — Supabase     │    │  Expo.dev —     │  │
│  │  NestJS :3001       │──────▶  PostgreSQL 15 +         │    │  Mobile OTA     │  │
│  │  (Web Service)      │◀─────  PostGIS + RLS + Auth    │    │  updates, build │  │
│  │  Node 20 alpine     │      │  Storage (venue images)  │    │  service        │  │
│  │  Auto-SSL, auto-    │      │  + Edge Functions        │    │                 │  │
│  │  deploys GH main    │      └────────────┬─────────────┘    │  eas build      │  │
│  │                     │                   │                  │  eas submit -p   │  │
│  │  Inb. Webhooks ←────│    ┌──────────────▼──────────────┐   │  android        │  │
│  │    from Razorpay    │    │ Transactional email —      │   │                 │  │
│  │    & Supabase       │    │   Resend.com               │   │                 │  │
│  │                     │    │   (receipts, magic links)  │   │                 │  │
│  │  Outbound: Razorpay │    │                            │   │                 │  │
│  │  (bookings + shop)  │    │   Webhook → Nest /email    │   │                 │  │
│  │  Outbound: FCM push │    │   controller → Resend SDK  │   │                 │  │
│  └─────────────────────┘    └────────────────────────────┘   └─────────────────┘  │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ Database — Supabase (PostgreSQL + Auth + Storage)

Supabase hosts Postgres, Auth (JWT), Storage (images), and PostGIS extension.

**Steps:**

1. Sign up at https://supabase.com → New Project → Region: **Mumbai (ap-south-1)** (lowest latency India)
2. **Settings → Database → Connection string**: copy `Pooler` URL (port 6543, transaction mode) → paste into Render env as `DATABASE_URL`
3. **Enable PostGIS extension** — SQL Editor → `CREATE EXTENSION IF NOT EXISTS postgis;` (needed for "Near Me" radius search later)
4. **Create Storage buckets** (public or private, per your preference):
   - `venue-images` — venue/court photos
   - `product-images` — shop product photos
   - `user-avatars` — profile pictures
   - `essential-images` — racket/shuttle SKU photos (NEW)
5. **Auth → URL Configuration**:
   - Redirect URLs in dev: `http://localhost:3000`, `exp://127.0.0.1:19000`, `playmate://`
   - Redirect URLs in prod: `https://playmate.app/oauth/callback`, play store deep-link URL
6. **Auth → Providers**: enable Email, Phone (India requires DLT registration for SMS — use Twilio/MSG91 add-on or Magic Link as fallback), Google OAuth client ID
7. **RLS Policies** — create these under SQL Editor → Policies:
   ```sql
   ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "users can only see own bookings" ON bookings
     FOR SELECT USING (user_id = auth.uid());
   CREATE POLICY "venue_owners CRUD their own venues" ON venues
     FOR ALL USING (owner_id = auth.uid());
   CREATE POLICY "users can only see own cart" ON cart
     FOR SELECT USING (user_id = auth.uid());
   ```
   Enable RLS on every user-facing table; NestJS bypasses RLS ONLY with `SUPABASE_SERVICE_ROLE_KEY` (inside trusted backend).
8. Supabase **Realtime**: enable on `bookings`, `notifications`, `on_demand_orders` tables → staff tablet gets live "new on-demand order" events.

---

## 2️⃣ API Backend — Render.com (NestJS Node Web Service)

Render is the simplest Node host for NestJS; auto-SSL, zero-config deploys from GitHub main, free staging tiers.

**Steps:**

1. New → **Web Service** → Connect `Vitesh21/playmate` repo
2. **Settings**
   - **Root Directory** — leave blank (or `apps/api`)
   - **Build Command**:
     ```bash
     corepack enable && corepack prepare pnpm@9.0.0 --activate
     pnpm install --frozen-lockfile
     pnpm build
     pnpm db:migrate
     ```
   - **Start Command**:
     ```bash
     pnpm --filter @playmate/api start:prod
     ```
   - **Runtime**: Node **20.11.1**
   - **Region**: Singapore (sin) — good latency for India users; Render doesn't yet have Mumbai, so pick Singapore (50ms vs ~200ms Frankfurt).
3. **Environment Variables** (paste from `.env.example`, but swap all values for prod):
   - `NODE_ENV=production`
   - `DATABASE_URL` → **Supabase Pooler** URL (from step 1)
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (**LIVE mode keys**, not TEST)
   - `RESEND_API_KEY` — create key at https://resend.com (Domain Authentication: add TXT record → ensure booking@playmate.app is verified for deliverability)
   - `API_PORT=10000` (Render's default)
   - `API_BASE_URL=https://api.playmate.app`, `NEXT_PUBLIC_API_URL=https://api.playmate.app`
   - `NEXT_PUBLIC_APP_URL=https://playmate.app` (deep link fallbacks)
4. **Custom domain** → `api.playmate.app` → Render provisions SSL automatically
5. **Auto-deploy** = yes → every merge to `main` triggers a fresh build + runs `pnpm db:migrate` against Supabase (idempotent — Drizzle tracks migrations folder hash)
6. **Healthcheck** path = `/health` — Render restarts container if 3× fail.
7. **Scaling**: Start with `Starter ($7/mo)` for MVP; bump to `Standard ($20)` when >100 concurrent users → API handles ~2k req/s in that tier; scale horizontally (add instances) for booking peaks (weekends 6–10PM IST).

### Alternative API hosts
- **Fly.io** — if you want to host in **Mumbai (bom)** directly (6ms pings vs Render 50ms).
- **AWS ECS Fargate / Railway / DigitalOcean Apps** — all work identically; same Dockerfile (add your own later if Render's Node runtime is problematic).

---

## 3️⃣ Mobile App (Android) — Expo.dev → Play Store

We use **Expo EAS Build + Submit** for a full Play Store release pipeline without touching Android Studio.

### 3A. Dev → Staging

1. `pnpm i -g eas-cli` → `eas login` (same Expo account)
2. `eas init` in `apps/mobile` → links to Expo project
3. Create EAS build profiles in `apps/mobile/eas.json` (create this file):
   ```json
   {
     "build": {
       "development": {
         "developmentClient": true,
         "distribution": "internal",
         "android": { "buildType": "apk" }
       },
       "preview": {
         "distribution": "internal",
         "android": { "buildType": "apk" }
       },
       "production": {
         "distribution": "store",
         "android": { "buildType": "app-bundle" }
       }
     }
   }
   ```
4. Environment variables — pass via `EXPO_PUBLIC_*` prefix at **build time**:
   ```bash
   EAS_BUILD_PROFILE=production \
   EXPO_PUBLIC_API_URL=https://api.playmate.app \
   EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI... \
   EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_live_XXX \
   eas build --platform android --profile production
   ```

### 3B. Play Store Release

1. **Google Play Console** developer account ($25 one-time)
2. Create App → **Playmate** → package name matches `expo.android.package` in `app.json` (already set to `com.playmate.app`)
3. Upload the **`.aab`** (App Bundle) produced by `eas build` to **Internal Testing track** first
4. Fill: store listing, screenshots (add 5), store description (English + Hindi), content rating questionnaire, target audience (13+)
5. **App signing**: Play App Signing is default → keep the `upload.jks` from EAS safe
6. Promote: Internal → Closed (Beta testers on WhatsApp group) → Open → Production
7. **Expo OTA updates (hot pushes, no Play Store review needed for UI/bugfix)**:
   ```bash
   eas update --branch production --message "fix: badge theme dark mode"
   ```
   Mobile app pulls this delta on next cold start instantly (great for quickly patching bugs without 2–3 day PlayStore review).

### 3C. Future iOS (same code)
- Pay Apple Developer $99/year → `eas build --platform ios --profile production` → upload `.ipa` via Transporter → App Store Connect submission

---

## 4️⃣ Payments — Razorpay (India)

Razorpay powers both booking+essentials checkout AND shop e-commerce checkout with a single integration.

### Setup
1. Razorpay Dashboard → https://dashboard.razorpay.com → switch to **Live** mode
2. Settings → API Keys → regenerate → paste `RAZORPAY_KEY_ID` (NestJS `.env`) and `NEXT_PUBLIC_RAZORPAY_KEY_ID` (mobile build env)
3. Settings → **Webhooks** → Add New:
   - **URL**: `https://api.playmate.app/payments/webhook`
   - **Secret**: generate a long random string; paste to NestJS as `RAZORPAY_WEBHOOK_SECRET` (validate every webhook's `X-Razorpay-Signature` header BEFORE marking booking CONFIRMED — **MUST**; otherwise fake `payment.captured` events would leak slots)
   - **Active events**: `payment.captured`, `payment.failed`, `refund.processed`
4. Razorpay **Checkout.js customizations**: set brand color `#3A5851` (Playmate primary), logo link, auto-read UPI intent on Android.
5. **Settlement schedule**: Razorpay settles T+2 (or request T+1 once volume grows)
6. **GST / invoicing**: Razorpay Tax APIs → attach 18% GST on shop orders; 12% GST on court booking (India GST rules — verify with CA)

---

## 5️⃣ Notifications & Email

### Push Notifications — Expo Push → FCM (Android default)
1. Firebase console → Project → Android app `com.playmate.app` → `google-services.json`
2. `expo prebuild` or EAS config injects it;
3. Users opt-in at first launch; store `expoPushToken` in `users.expo_push_token` column
4. NestJS `notifications.service.ts` → HTTP POST `https://exp.host/--/api/v2/push/send` batch of 100 notifications
5. **WhatsApp** for booking confirmations: Twilio (India DLT registered template) → "Your Playmate court C-2 at 7PM is confirmed! Tap to add rackets."

### Email — Resend
1. Resend → Domains → add `playmate.app` → verify TXT + DKIM (SPF+DMARC done via DNS)
2. Create API key → `RESEND_API_KEY` env in Render
3. Templates: `booking-confirmation`, `essentials-added`, `mid-game-order-placed`, `order-shipped`, `password-reset`

---

## 6️⃣ Monitoring & Observability

- **Render Metrics** built-in
- Add **Sentry** (expo-sentry + NestJS SDK): errors from Mobile + API in one dashboard
- **Logtail / BetterStack** for structured API log aggregation (search "failed razorpay webhook" in 1 click)
- **PostHog** → product analytics: funnel "Venue detail → Slot pick → Essentials added → Payment success" — answers "What % of badminton bookers also rent rackets?"

---

## 7️⃣ Domains & SSL

| Service | Host | DNS | SSL |
|---|---|---|---|
| API | Render | `api.playmate.app` → CNAME to Render URL | Render auto LetsEncrypt, renews |
| Marketing site | Vercel / Render Static | `playmate.app`, `www.playmate.app` | Same |
| Deep links (Android App Links) | `playmate.app` → `.well-known/assetlinks.json` | Verifies that `https://playmate.app/booking/:id` opens directly in Playmate app | Same |

**DNS Provider**: Cloudflare (free) → turn on Proxy (orange cloud) only for marketing static; **DNS-only (grey cloud)** for `api.playmate.app` to avoid Render-origin IP blocking from CF WAF.

---

## 8️⃣ Staging environment (separate from prod)

- Separate Supabase project `playmate-staging`
- Separate Render service `playmate-staging-api` (auto-deploys from `develop` branch)
- Separate Expo channel `staging` via `eas update --branch staging`
- Razorpay **TEST mode keys** in staging only

---

## 9️⃣ CI/CD Suggested pipeline

GitHub Actions (`.github/workflows/ci.yml`):

```yaml
on: [pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test                      # Jest route tests
      - run: pnpm build                     # Ensure builds
```

`on: push to main` → Render auto-deploys + runs migrations.

---

## 🔟 Costs estimate (Month-1 MVP scale: 10 venues, 200 users)

| Component | Tier | Monthly $ |
|---|---|---|
| Supabase Pro | Pro (8GB RAM, 250GB DB + 1TB Bandwidth) | $25 |
| Render API Web Service | Standard 1x (512MB RAM) | $20 |
| Expo (EAS builds/OTA) | Free tier for 1 app, upgrade later (when > 2 devs) | $0 → $99 |
| Resend Transactional Email | 3k / month | $0 → $5 |
| Razorpay Fees | 2% flat per successful txn (India) | % of GMV |
| Play Store / Apple Dev | fixed | $25 once + $99/yr |
| **Total** | | **$45–$50 / month MVP** |

Scales near-linearly with GMV; when 1000+ DAU upgrade Render to `Pro` + Supabase add Supavisor for pooling + read replicas.

---

## ✅ Production Go-Live Checklist

- [ ] Supabase RLS enabled on every table
- [ ] Razorpay webhook signature verification active in code
- [ ] `SUPABASE_SERVICE_ROLE_KEY` NOT present in mobile `process.env` (verify by searching `.expo/` output)
- [ ] API health check `/health` returns `success:true` from Render production
- [ ] At least 5 test users complete full flow: Sign up → Browse → Book → Add Essentials → Pay with Razorpay TEST → Confirmation screen → QR scan → On-Demand order
- [ ] Play Store listing approved
- [ ] App Links / deep links validated
- [ ] Sentry error alerts → Slack channel `#production-alerts`
- [ ] Database daily backup schedules enabled (Supabase does this automatically on paid tier)
- [ ] Monitoring dashboards: DAU, booking conversion %, essentials attach rate, avg order value

Happy shipping! 🎾🏀⚽
