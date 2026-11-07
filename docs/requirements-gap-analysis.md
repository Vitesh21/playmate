# Sports Community & Venue Booking Requirements — Gap Audit

**Audit date:** 2026-11-07
**Scope:** Compare the November 2026 Sports Community & Venue Booking App requirements (MVP, Phase 2, Phase 3, admin, and non-functional requirements) with the repository code visible on the default branch.
**Purpose:** This is an implementation checklist, not a claim that the listed features are complete. A screen, schema, roadmap entry, or endpoint alone does not count as an end-to-end feature.

## Status key

- **Implemented (I):** An end-to-end usable capability is evident in the inspected code.
- **Partial (P):** Some supporting UI/API/data exists, but important required behavior is absent or not wired end to end.
- **Missing (M):** No implementation was found in the inspected repository paths.
- **Decision (D):** Product decision is still required before implementation can be finalized.

Statuses are deliberately conservative. Validate them against a running environment and tests before release.

## Executive summary

The repository is a React Native/Expo mobile app and NestJS API with a PostgreSQL/Supabase data layer. It has a foundation for authentication, venue/court/slot browsing, transactional single-slot booking, payments, basic venue management and verification, public-game hosting/join requests, reports/blocks, and verified venue reviews. It is **not yet the full product described in the requirements**.

The largest end-to-end gaps are map and rich venue discovery, complete booking/refund/reschedule flows, private-game invitations and booking-linked games, player profiles/playpals/ratings/calendar, a complete venue-operator product, and nearly all Phase 2/3 community features. The current README roadmap is a different product roadmap (venue essentials, commerce, wallet, and marketplace) and does not track most of this requirements document. Treat those commerce/essentials features as separate scope rather than substitutes for the requested sports-app features.

## MVP — Booking + hosting

### Player app

| Requirement | Status | Evidence / implementation still needed |
|---|---|---|
| Phone OTP sign-up; optional Google/Apple; account access | P | Auth screens and Supabase integration are present. Verify phone OTP and Google/Apple flows end to end on supported devices; Apple sign-in and production configuration need verification. |
| Profile: name, photo, bio, sports/skill per sport, preferred times, home location | P | Basic user identity/profile fields exist; editable sports skills, preferences, and location profile are not evidenced as complete. |
| Profile/game/calendar privacy settings; hide phone by default; coarse location | M | Add explicit visibility/consent controls and enforce them in API responses and database policies. |
| Public profile with sports, ratings, games played, reliability | M | No complete player profile, rating aggregation, or reliability system. |
| Venue discovery list with sport/city/search | P | Venue list and basic API filters exist. Rich filtering and default distance sorting are not complete. |
| Venue map, clustered pins, venue preview cards, “search this area” | M | No map surface or map search flow found. |
| Discovery filters: date/time, price, indoor/outdoor, surface, amenities, rating, distance, available now | P | Some search DTO fields exist, but most are not applied by the venue query and are not exposed as complete UI filters. Implement and test each filter. |
| Saved searches and favorite venues | M | No saved-search or favorites feature found. |
| Venue detail: photos, description, sports/courts, pricing, amenities, rules, directions, reviews, availability | P | Detail/courts/slots and basic amenities are present. Rules, directions integration, review presentation, price-by-slot context, and complete availability UX need work. |
| Real-time availability and temporary payment hold | P | Single-slot booking has a transactional row lock and expiry handling. The configured hold is 15 minutes, not the example 5–10 minutes; validate expiry/availability behavior under concurrent requests and payment failures. |
| Consecutive-slot booking | M | Booking API accepts one court slot per booking. |
| UPI/cards/wallet payments; safe payment processing | P | Razorpay is integrated for booking checkout; verify supported methods, webhooks/signature verification, refunds, and production configuration. Do not store card data. |
| Book and invite friends; split payment | M | No booking invitation or group-payment flow found. |
| Booking confirmation in app with QR/booking ID and notification | P | Booking IDs and notifications infrastructure exist; a complete confirmation/ticket QR/check-in lifecycle is not evident. |
| Venue-policy cancellation, reschedule, automatic refunds | P | Pending booking cancellation/expiry exists. Confirmed cancellation/refund and rescheduling are not implemented end to end. |
| Recurring bookings | M | No recurring reservation flow found. |
| Create public/private games; optionally link a confirmed or proposed booking | P | Games schema/API supports visibility, hosting, join requests, instant join, and waitlisting. Mobile host flow currently posts public games; private invite delivery, host/co-host controls, and booking linkage/booking-pending flow are missing. |
| Game details: skill range, needed players, per-player cost, notes, venue/time | P | Several fields exist. Skill inputs/filtering and richer host/game controls are incomplete. |
| Invite playpals, bring friends, co-hosts, group notifications | M | No playpal invitation, guest count/invitation, co-host, or group integration found. |
| Host collects vs each joiner pays; payment on joining | M | Game cost is descriptive only; no collection/splitting/escrow/payment lifecycle. |
| Public-game discovery by sport/time/distance/skill | P | Authenticated public-game search has sport/date filtering; distance and skill filters are missing, with no full search UI. |
| Host sees requester rating/skill/reliability and approves/declines | P | Request management exists; requester metadata and player trust signals are missing. |
| Waitlist with automatic promotion | P | Waitlist and promotion logic exist in the game service. Verify notification and concurrency behavior. |
| Game cancel/reschedule, notify participants, handle refunds | M | No host cancellation/reschedule lifecycle or linked-payment refund handling found. |
| Playpals: add/search/contact sync/friend requests/accept/decline | M | User blocking exists, but friendship, username/phone lookup, contact consent/sync, and request flows do not. |
| Block/report | P | User blocking and basic game/user/review reporting support exists. Verify all surfaces, admin resolution, and privacy behavior. |
| Player/venue ratings after games; host rating; reliability/no-show score | P | Verified venue reviews exist for completed bookings. Player-to-player, sportsmanship/punctuality, host ratings, no-show/late-cancel tracking, rating windows, mutual hiding, and reports are missing. |
| Player calendar: bookings, hosted/joined games, pending requests | P | Booking list and “my games” endpoints/screens exist separately; there is no unified calendar view or pending-request calendar experience. |
| Calendar export, reminders, overlap warnings, opt-in friends’ availability | M | No calendar integrations, conflict checks, or availability sharing found. |
| Notifications with category preferences and quiet hours | P | In-app notification records/list/read support exists. Push delivery, game/social events, category preferences, quiet hours, and dependable scheduled reminders are not complete. |

### Venue Partner surface

| Requirement | Status | Evidence / implementation still needed |
|---|---|---|
| Venue manager onboarding and business/document verification | P | Venue creation and admin approval queue exist; business-document collection and verification workflow are not evident. |
| Partner app/surface; owner, manager, front-desk roles; multiple venues | P | A role-gated Manage area and venue ownership exist in the same mobile app. This is not a separate partner app, and staff accounts/roles and multi-location controls are missing. |
| Venue/court details, photos, amenities, rules, cancellation policy | P | Basic venue/court CRUD exists. Policy/rules fields and complete management UX are missing or incomplete. |
| Weekly court schedule, holiday/maintenance overrides, manual blocks | P | Court-slot management exists. Recurring schedule templates, overrides, and explicit block reasons/lifecycle are not evident. |
| Slot durations and configurable pricing rules/promotions | P | Slots have prices and courts have hourly rates. Duration choices, peak/off-peak, weekday/weekend, per-sport/court rules, discounts, bulk and membership prices are missing. |
| Availability changes sync immediately to player search | P | Shared database/API provides the basis; verify cache invalidation and real-time propagation. |
| Today/upcoming booking calendar; accept/modify/cancel/no-show | P | Customer bookings exist; partner booking operations/calendar and no-show management are not evidenced as complete. |
| Walk-in/offline bookings as single source of truth | M | No offline booking support or offline-tolerant sync found. |
| QR check-in | M | No booking check-in QR workflow found. |
| Earnings, commission, bank payouts, settlement statements | M | No partner payout/settlement implementation found. |
| Occupancy/revenue/repeat-customer/peak-time insights | M | No partner analytics dashboard found. |
| Reviews and public venue replies | P | Venue reviews exist; owner response workflow and partner review management are missing. |

### Admin surface

| Requirement | Status | Evidence / implementation still needed |
|---|---|---|
| Venue verification and listing control | P | Admin queue and approve/reject endpoints/UI exist. Extend with submitted documents, audit trail, and listing moderation controls. |
| User management, bans, reports queue | P | User listing and report/block foundations exist. Ban/suspension actions and a complete moderation workflow are missing or need verification. |
| Disputes and refund handling | M | No dispute case workflow or admin refund controls found. |
| Moderation for posts/chat/reviews | P | Reports exist for current reportable targets; there is no chat/blog moderation because those products are absent. Review moderation needs verification. |
| Analytics: bookings, GMV, active users, fill rate, retention | M | Existing dashboard counts users/sports/venues, not the requested operational/business metrics. |
| Configure sports, amenities, commission, promo codes | P | Sports management foundation exists; amenity taxonomy, commissions, and promo-code configuration are not evident. |

## Phase 2 — Social

| Requirement | Status | Evidence / implementation still needed |
|---|---|---|
| Playpal one-to-one chat | M | No chat tables, API, or UI found. |
| Temporary match chat; membership and read-only closure after game | M | No chat or game-chat lifecycle found. |
| Report message, mute, block | P | User-level block/report foundations exist; message-level controls depend on chat and are absent. |
| Groups: members, name/photo/rules, group chat, admin/member roles | M | No group or group-membership implementation found. |
| Notify groups about games; one-tap join respecting privacy rules | M | No group/game integration found. |
| Venue reviews | P | Verified venue review submission exists; complete detail-page display, replies, moderation, rating summary, and owner tools need completion. |
| Notifications polish | P | Basic notification persistence exists; event coverage, push delivery, preferences, quiet hours, and reminder scheduling are incomplete. |

## Phase 3 — Community & growth

| Requirement | Status | Evidence / implementation still needed |
|---|---|---|
| Posts/blogging: publish, venue/sport/game tags, likes/comments, city/sport feed | M | No content/posts model, API, or UI found. |
| Day-one content moderation and staged rollout | M | No blogging system or moderation queue for posts exists. |
| Leaderboards and streaks | M | Not found. (A different roadmap mentions leaderboards in its Phase 4; that is not an implementation.) |
| Coaching marketplace | M | Not found. |
| Loyalty/rewards | M | Not found. |
| Corporate/bulk booking | M | Not found. |
| Tournaments, live scoring, equipment marketplace/video | Out of scope | Explicit non-goals for now; do not include in MVP unless scope changes. |

## Cross-cutting / non-functional requirements

| Requirement | Status | Evidence / implementation still needed |
|---|---|---|
| Transactionally safe booking and no double booking | P | A row-locking booking implementation exists. Add automated concurrency/integration tests, ensure slot holds expire safely, and cover refund/reschedule state transitions. |
| Search/map under 2 seconds and city-scale geo queries | M | No map/PostGIS-backed geo discovery or performance evidence found. Define indexes, query bounds, caching, and measurable performance tests. |
| Security, privacy, DPDP compliance, contact-sync consent | P | Auth/RBAC and a database RLS policy file exist. Verify policies are applied/enforced for every table and endpoint; add privacy settings, retention/deletion behavior, consent records, and compliance review. |
| Safer public games and moderation | P | Phone-auth foundation, blocking, and reports exist. Add profile trust signals, game controls, moderation operations, and safety-focused flows. |
| PCI-compliant gateway and no card data stored | P | Razorpay integration is the intended payment route. Verify production gateway configuration, webhook signature checks, access controls, and refund reconciliation. |
| City-by-city scaling and venue cache | M | No explicit rollout/geo-cache implementation found. |
| Accessibility, font scaling, contrast, local languages | P | The app has a theme/design-system foundation; accessibility and localization coverage have not been verified. Add accessibility audits and localized content. |
| Venue manager offline tolerance | M | No local day-booking cache or offline reconciliation found. |
| Responsive support | M | No in-product support/help/dispute escalation workflow was found. |

## Product decisions still needed

Resolve these before locking schemas and checkout behavior: launch city and initial sports; native vs cross-platform target (the repository currently uses React Native/Expo); pay-at-booking vs pay-at-venue; split-payment and collection model; default game approval behavior; platform-vs-venue cancellation limits; venue field verification; blog eligibility/moderation; target audience and final product name; commission/subscription/featured-listing model. Record decisions and owners in product planning before implementation.

## Recommended delivery order

1. **Close MVP booking integrity:** confirm production payment/webhook and refund paths; implement confirmed cancellation/reschedule policy; add consecutive slots and booking confirmation/check-in; test competing reservations and expiry.
2. **Make supply usable:** complete venue onboarding/verification, pricing/schedule overrides, booking calendar, walk-ins, and a partner-facing daily-operations workflow.
3. **Complete player MVP:** rich searchable venue discovery, favorites, player profiles and skill data, private invites, booking-linked games, join/payment rules, unified calendar, reminders, post-game ratings, and trust/reliability signals.
4. **Build safety and operations:** admin bans/reports/disputes/refunds, moderation audit trail, support workflow, privacy controls, and verified operational analytics.
5. **Phase 2 social:** friendships, chat, temporary match rooms, groups, and notification preferences. Ship moderation/block/report controls together with each social surface.
6. **Phase 3 growth:** posts/blogging with moderation, leaderboards, coaching, rewards, and corporate/bulk bookings after retention and supply metrics justify them.
7. **Keep the existing commerce/essentials roadmap separate:** reconcile its phase labels and features with this product roadmap so that two different roadmaps do not claim the same release capacity.

## Suggested acceptance rule

Mark a checklist row **Implemented** only after its mobile/partner/admin UX, validated API, persisted data/state transitions, authorization/privacy rules, error and empty states, and automated tests are all present. Update this audit as features land; a roadmap entry or placeholder screen is not completion.
