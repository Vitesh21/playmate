/**
 * @playmate/types — Shared domain types for the entire sports platform.
 *
 * Keep this package free of runtime code: only TypeScript types, interfaces,
 * and string enums (string enums compile to small JS lookup tables, so they
 * are acceptable in a types package).
 *
 * Consumed by:
 *   - apps/mobile (React Native / Expo Android + iOS frontend)
 *   - apps/api    (NestJS backend)
 *   - packages/validation (zod schema type inference)
 *   - packages/config     (env + app constants)
 */

/** UUID-based primary key used across every table in the database. */
export type ID = string;

/** Base fields automatically stamped on every row by PostgreSQL `DEFAULT now()`.
 *  Every entity in the schema intersects this type. */
export type Timestamp = {
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Lifecycle of a court booking.
 *
 *  PENDING   → user clicked "book", slot is soft-locked, payment NOT confirmed.
 *              Expires after 15 min if Razorpay webhook doesn't arrive.
 *  CONFIRMED → Razorpay `payment.captured` webhook received, slot permanently booked.
 *  EXPIRED   → Pending booking timed out, slot released back to inventory.
 *  CANCELLED → User / admin explicitly cancelled before play time.
 *  REFUNDED  → Money returned post-confirmation (refund window in `packages/config`).
 */
export enum BookingStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
}

/** Mirrors `payments.payment_status` enum; keeps DB and in-memory types in sync. */
export enum PaymentStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

/** Payment gateways supported. Add UPI/Stripe/Paytm as new enum members. */
export enum PaymentMethod {
  RAZORPAY = "RAZORPAY",
}

/**
 * Lifecycle of an e-commerce order.
 *  PENDING   → Cart converted, inventory reserved, waiting for Razorpay.
 *  CONFIRMED → Payment captured.
 *  SHIPPED   → Tracking # populated, fulfillment provider handed off.
 *  DELIVERED → Terminal success state.
 *  CANCELLED → User cancelled before shipment.
 *  REFUNDED  → Returned / money returned.
 */
export enum OrderStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  SHIPPED = "SHIPPED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
}

/**
 * A user profile synced from Supabase Auth.
 * The `id` field MUST match `auth.users.id` in Supabase (1:1, upsert on first login).
 */
export type User = {
  id: ID;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  role: UserRole;
} & Timestamp;

/**
 * RBAC roles.
 *  USER         → normal logged-in customer (default).
 *  ADMIN        → full access to /api/admin/* + every CRUD endpoint.
 *  VENUE_OWNER  → can only CRUD their own venues + courts.
 *  SELLER       → can only CRUD their own products + inventory.
 */
export enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN",
  VENUE_OWNER = "VENUE_OWNER",
  SELLER = "SELLER",
}

/** Top-level sport taxonomy (Badminton, Football, Basketball, etc.).
 *  Every venue belongs to exactly one sport; categories in the shop are separate. */
export type Sport = {
  id: ID;
  name: string;
  /** URL-safe unique slug used in routes: /venues/badminton */
  slug: string;
  description?: string | null;
  iconUrl?: string | null;
  /** Soft-delete: set false instead of deleting rows. */
  isActive: boolean;
} & Timestamp;

/** A venue (aka facility/arena). 1 venue → N courts → N*M slots per week. */
export type Venue = {
  id: ID;
  name: string;
  /** /venues/smash-arena-gachibowli */
  slug: string;
  description?: string | null;
  sportId: ID;
  address: string;
  city: string;
  state: string;
  pincode: string;
  /** Used for "near me" radius search once PostGIS is installed. */
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  email?: string | null;
  images: string[];
  /** Free-text amenities: ["Parking", "AC", "Shower", "Changing Room", "Pro Shop"] */
  amenities: string[];
  /** 7 entries, one per weekday (0 = Sunday, 6 = Saturday). */
  operatingHours: OperatingHours[];
  isActive: boolean;
  /** FK to users.user_role = VENUE_OWNER. Optional for MVP. */
  ownerId?: ID | null;
} & Timestamp;

/** Open/close times for a single weekday. `isClosed=true` marks the day off. */
export type OperatingHours = {
  day: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
};

/** A single bookable court inside a venue. */
export type Court = {
  id: ID;
  venueId: ID;
  /** e.g. "Court 1", "Synthetic Court", "Wooden Court" */
  name: string;
  description?: string | null;
  /** e.g. "Singles", "Doubles", "5-a-side" */
  type?: string | null;
  /** Surface material: "Synthetic", "Wooden", "Turf", "Acrylic" */
  surface?: string | null;
  /** Cost per hour in INR (paise NOT used here — DB stores integers, so keep as INR). */
  hourlyRate: number;
  images: string[];
  isActive: boolean;
} & Timestamp;

/**
 * A single bookable 1-hour (or configurable-length) time slot on a court.
 *
 * ⚠️  Database has a UNIQUE constraint on (court_id, date, start_time, end_time)
 * — this is the ultimate guard against duplicate slots regardless of bugs.
 *
 * `isAvailable` flips to false the moment a PENDING booking is created,
 * and flips back to true on cancel/expire.
 */
export type CourtSlot = {
  id: ID;
  courtId: ID;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  price: number;
} & Timestamp;

/** A single booking transaction for exactly 1 court slot. */
export type Booking = {
  id: ID;
  userId: ID;
  courtSlotId: ID;
  status: BookingStatus;
  /** Total amount in INR. For now = slot.price; later add convenience fees / discounts. */
  totalAmount: number;
  /** When to auto-release the slot if payment doesn't complete (15 min from now). */
  expiresAt?: Date | null;
  paymentId?: ID | null;
} & Timestamp;

/**
 * Hierarchical e-commerce category tree.
 * Example: "Badminton" (parentId = null) → "Rackets" (parentId = Badminton.id)
 */
export type Category = {
  id: ID;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: ID | null;
  imageUrl?: string | null;
  isActive: boolean;
  /** Sort order in nav menus (lower first). */
  sortOrder: number;
} & Timestamp;

/** Top-level product listing page entity. Has-many variants (SKUs). */
export type Product = {
  id: ID;
  name: string;
  slug: string;
  description: string;
  categoryId: ID;
  brand?: string | null;
  images: string[];
  isActive: boolean;
  /** Denormalised for listing pages; recomputed on each review insert. */
  averageRating?: number | null;
  reviewCount: number;
  sellerId?: ID | null;
} & Timestamp;

/**
 * A sellable SKU. Customers add *variants* to cart, not products.
 * One product "Yonex Astrox 99 Pro" → multiple variants: 4U/G5 · Red, 3U/G5 · White, ...
 */
export type ProductVariant = {
  id: ID;
  productId: ID;
  /** Stock-keeping unit. UNIQUE in DB. Use e.g. "YX-A99PRO-4U5-RED". */
  sku: string;
  size?: string | null;
  color?: string | null;
  price: number;
  /** Original "strike-through" price for discount displays. */
  compareAtPrice?: number | null;
  /** Variant-specific images (e.g. different racket color angles). */
  images: string[];
} & Timestamp;

/**
 * Per-SKU stock tracker.  (variant_id, warehouse) is UNIQUE in DB.
 *  availableToSell = quantity - reservedQuantity.
 *
 * Checkout decrements `quantity` and increments `reservedQuantity` atomically.
 * Payment confirmation (or 24h expiry) flips the reservedQuantity out permanently.
 */
export type Inventory = {
  id: ID;
  variantId: ID;
  quantity: number;
  reservedQuantity: number;
  warehouse?: string | null;
} & Timestamp;

/** One shopping cart per user (auto-created on first cart.add call). */
export type Cart = {
  id: ID;
  userId: ID;
} & Timestamp;

/** A single line in the cart (variant × qty). */
export type CartItem = {
  id: ID;
  cartId: ID;
  variantId: ID;
  quantity: number;
} & Timestamp;

/** Order header — one row per checkout. */
export type Order = {
  id: ID;
  userId: ID;
  status: OrderStatus;
  subtotal: number;
  /** India GST @ 18% — make configurable per category later. */
  tax: number;
  /** Free shipping above subtotal ≥ ₹999, else flat ₹49. */
  shipping: number;
  discount: number;
  /** subtotal + tax + shipping - discount.  The number actually charged to Razorpay. */
  totalAmount: number;
  /** Snapshotted JSON address (not an FK — addresses may be edited post-order). */
  shippingAddress: Address;
  billingAddress?: Address | null;
  trackingNumber?: string | null;
  paymentId?: ID | null;
} & Timestamp;

/** Standardised shipping/billing address block. Matches Indian pincode format. */
export type Address = {
  firstName: string;
  lastName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

/** Individual product line inside an order — price snapshot so future catalog price edits don't break old invoices. */
export type OrderItem = {
  id: ID;
  orderId: ID;
  variantId: ID;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
} & Timestamp;

/** Generic payment record. Linked to EITHER an orderId (shop) OR a bookingId (play). */
export type Payment = {
  id: ID;
  userId: ID;
  /** INR amount (not paise — ×100 happens at gateway call site only). */
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  /** Razorpay order / payment id — for capture + refund API calls. */
  transactionId?: string | null;
  /** Raw JSON response from Razorpay, useful for reconciliation. */
  gatewayResponse?: Record<string, unknown> | null;
  orderId?: ID | null;
  bookingId?: ID | null;
} & Timestamp;

/** User review. Either venueId XOR productId (both nullable but exactly one should be set — enforced in service layer). */
export type Review = {
  id: ID;
  userId: ID;
  /** 1..5 integer stars. */
  rating: number;
  comment?: string | null;
  venueId?: ID | null;
  productId?: ID | null;
  images: string[];
  /** True if user has a confirmed booking for the venue / confirmed order for the product. */
  isVerified: boolean;
} & Timestamp;

/** In-app push / email notification. Rendered in the bell icon dropdown. */
export type Notification = {
  id: ID;
  userId: ID;
  type: NotificationType;
  title: string;
  message: string;
  /** Arbitrary JSON for deep-link params: { bookingId, orderId, productId, ... } */
  data?: Record<string, unknown> | null;
  readAt?: Date | null;
} & Timestamp;

/** Semantic types → colour/icon styling in the UI and template selection for email. */
export enum NotificationType {
  BOOKING_CONFIRMED = "BOOKING_CONFIRMED",
  BOOKING_REMINDER = "BOOKING_REMINDER",
  ORDER_CONFIRMED = "ORDER_CONFIRMED",
  ORDER_SHIPPED = "ORDER_SHIPPED",
  ORDER_DELIVERED = "ORDER_DELIVERED",
  PAYMENT_SUCCESS = "PAYMENT_SUCCESS",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  GENERAL = "GENERAL",
}

/**
 * Standard envelope that every API endpoint returns.
 * Pattern: `{ success: true, data: T }` on happy path,
 *          `{ success: false, error: { code, message, details } }` otherwise.
 */
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
};

/** Machine-readable error shape for clients to act on. */
export type ApiError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

/** Generic paginated listing shape. */
export type PaginatedResponse<T> = {
  items: T[];
  /** Total rows matching filters (before page limit). */
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

/** Input params accepted by every listing endpoint. */
export type PaginationParams = {
  page?: number;
  perPage?: number;
};

/* ==========================================================================
   VENUE ESSENTIALS — the "forgot your racket? we'll bring it to court" flow.
   Inspired by "District" style all-in-one venue experience:
     - When a user books a court, we upsell RENTABLE items (rackets, shuttle
       tubes, grip tape) + CONSUMABLES delivered to the court on arrival.
     - Can also be ordered "on demand" after check-in via QR scan at venue.
   ========================================================================== */

/**
 * Is this essential rented per booking, or sold as a consumable?
 *  RENT     → "Badminton Racket Pro" · ₹80/court-hour · returned post-play
 *  SALE     → "Yonex Mavis 350 (tube of 6)" · ₹420 · customer keeps
 *  ADDON    → "Court Mop + Towel Service" · ₹50 flat per booking
 */
export enum EssentialType {
  RENT = "RENT",
  SALE = "SALE",
  ADDON = "ADDON",
}

/**
 * Pricing strategy for a venue-essential SKU.
 *  PER_HOUR  → price × booking duration in hours (racket rental)
 *  PER_BOOKING → flat fee per booking regardless of length (towel service)
 *  FIXED    → price × quantity (shuttle tube - consumable sale)
 */
export enum EssentialPricingModel {
  PER_HOUR = "PER_HOUR",
  PER_BOOKING = "PER_BOOKING",
  FIXED = "FIXED",
}

/**
 * A "Pro Shop" catalog item that a venue keeps on hand to hand to players.
 * FK → venue. One venue → many essentials (badminton rackets, shuttle tubes,
 * basketballs, table-tennis balls, grip tape, sweat bands, …).
 */
export type VenueEssential = {
  id: ID;
  venueId: ID;
  sportId: ID;
  /** e.g. "Yonex Nanoray 7000i (Rental Racket)" */
  name: string;
  /** Short description shown next to the SKU. */
  description?: string | null;
  /** Image URL - same Supabase venues bucket for convenience. */
  imageUrl?: string | null;
  type: EssentialType;
  pricingModel: EssentialPricingModel;
  /** Base price in INR - interpreted per pricingModel above. */
  price: number;
  /** Strike-through "MRP" for visual discount cues. */
  compareAtPrice?: number | null;
  /** On-hand stock. RENT items decrement per overlapping booking hour. */
  stockQuantity: number;
  /** Max units a single booking can add. e.g. rackets: 4; shuttle: 2 tubes. */
  maxPerBooking: number;
  /** Comma-free search tags: ["racket", "yonex", "graphite", "4u"]. */
  tags: string[];
  /** Quick-fit filter chips on the booking-addon screen. */
  categories: string[];
  isActive: boolean;
} & Timestamp;

/**
 * A line-item attached to a booking (not to an e-commerce Order) for
 * rackets/shuttles/add-ons delivered to the court. Payment rolls into the
 * same Razorpay booking transaction so user pays once.
 */
export type BookingEssential = {
  id: ID;
  bookingId: ID;
  essentialId: ID;
  /** Snapshot of SKU name, price, model at checkout so edits to catalog
   *  never retroactively change old receipts. */
  nameSnapshot: string;
  typeSnapshot: EssentialType;
  pricingModelSnapshot: EssentialPricingModel;
  /** Unit price at booking time (INR). */
  unitPriceSnapshot: number;
  /** How many the user ordered. */
  quantity: number;
  /** For PER_HOUR items: how many hours they rented (usually = booking length). */
  durationHours?: number | null;
  /** Computed line total = unitPrice × qty (× duration if PER_HOUR). */
  lineTotal: number;
  /**
   *  PENDING   → line created, not yet handed over by venue staff
   *  DELIVERED → staff scanned QR / marked "given to court X"
   *  RETURNED  → RENT item returned post-session
   *  DAMAGED   → extra charge may be raised on the payment
   */
  fulfillmentStatus: "PENDING" | "DELIVERED" | "RETURNED" | "DAMAGED";
} & Timestamp;

/**
 * A "Need-a-Racket?" quick-rec shown above the slot picker after a user
 * selects a court + time. UI: horizontal rail of recommended essentials
 * filtered by sportId of the venue.
 */
export type EssentialRecommendation = {
  essential: VenueEssential;
  /** "Most booked at this venue", "Beginners' pick", "Stock low". */
  badge?: string | null;
  /** 0..1 sort weight: higher = shown first in the rail. */
  weight: number;
};

/**
 * User scans a QR code stuck on the court door during a session to
 * add more shuttles / water / grips mid-play.
 */
export type OnDemandOrder = {
  id: ID;
  bookingId: ID;
  userId: ID;
  /** e.g. "Court 3, delivered to bench nearest net" */
  deliveryNote?: string | null;
  totalAmount: number;
  paymentId?: ID | null;
  status: "REQUESTED" | "PREPARING" | "DELIVERED" | "CANCELLED";
  requestedAt: Date;
  deliveredAt?: Date | null;
} & Timestamp;

export type OnDemandOrderItem = {
  id: ID;
  onDemandOrderId: ID;
  essentialId: ID;
  nameSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  lineTotal: number;
} & Timestamp;

/* ==========================================================================
   COMPLETE FEATURE ROADMAP — visible in types so API + Mobile plan together.
   Grouped by release (MVP → 1.1 → 1.5 → 2.0).
   ========================================================================== */

export enum RoadmapTrack {
  MVP_CORE = "MVP_CORE",
  VENUE_ESSENTIALS = "VENUE_ESSENTIALS",
  ENGAGEMENT = "ENGAGEMENT",
  DISCOVERABILITY = "DISCOVERABILITY",
  COMMUNITY = "COMMUNITY",
  WALLET_SUBSCRIPTIONS = "WALLET_SUBSCRIPTIONS",
  VENUE_OWNER_DASHBOARD = "VENUE_OWNER_DASHBOARD",
  B2B_PRO_SHOP = "B2B_PRO_SHOP",
}

export type RoadmapFeature = {
  id: string;
  track: RoadmapTrack;
  title: string;
  description: string;
  /** Rough release milestone ordering. */
  phase: 1 | 2 | 3 | 4;
  /** Which parts of the monorepo are touched. */
  surface: Array<"mobile" | "api" | "shared-types" | "validation" | "admin-web" | "billing" | "notifications">;
  userValue: string;
};

export const ROADMAP: RoadmapFeature[] = [
  { id: "mvp-auth", track: RoadmapTrack.MVP_CORE, phase: 1,
    title: "Phone + Email + Google Auth via Supabase", description: "Login with OTP on phone, email/password, Google OAuth.",
    surface: ["mobile", "api", "shared-types"], userValue: "Frictionless sign-up, verified user profiles." },
  { id: "mvp-venue-browse", track: RoadmapTrack.MVP_CORE, phase: 1,
    title: "Browse venues by sport/city with filters", description: "Sports chip bar → Venue list → Venue detail → Courts grid.",
    surface: ["mobile", "api", "shared-types"], userValue: "Find badminton/basketball/football courts near the user." },
  { id: "mvp-slot-booking", track: RoadmapTrack.MVP_CORE, phase: 1,
    title: "Slot booking + 15-min soft-lock + Razorpay", description: "Pick slot → create booking (slot held) → Razorpay checkout → webhook confirms.",
    surface: ["mobile", "api", "shared-types", "validation"], userValue: "1-tap booking, never double-booked." },
  { id: "mvp-my-bookings", track: RoadmapTrack.MVP_CORE, phase: 1,
    title: "Upcoming / Past bookings + 24h cancellation", description: "Calendar view, cancel before 24h → auto-refund, reschedule flow.",
    surface: ["mobile", "api"], userValue: "Manage all bookings in one list." },

  { id: "essentials-upsell", track: RoadmapTrack.VENUE_ESSENTIALS, phase: 2,
    title: "\"Need a Racket?\" upsell on booking confirm screen", description: "After slot-pick, show venue's rental rackets, shuttle tubes, towel add-ons.",
    surface: ["mobile", "api", "shared-types"], userValue: "Player shows up empty-handed → still plays. Venue earns rental revenue." },
  { id: "essentials-pay-together", track: RoadmapTrack.VENUE_ESSENTIALS, phase: 2,
    title: "Essentials + court billed as one Razorpay order", description: "BookingEssential lines rolled into booking total_amount; single checkout.",
    surface: ["mobile", "api"], userValue: "One payment for everything - no split bills at venue." },
  { id: "essentials-checkin-qr", track: RoadmapTrack.VENUE_ESSENTIALS, phase: 2,
    title: "Arrival QR scan → staff prepares gear", description: "QR on booking ticket scans to Pro Shop tablet: 'Court 2 wants 2 rackets + 1 Mavis tube'.",
    surface: ["mobile", "api", "admin-web"], userValue: "Gear is ready the moment user walks in, zero queue at desk." },
  { id: "essentials-mid-game", track: RoadmapTrack.VENUE_ESSENTIALS, phase: 3,
    title: "Mid-game on-demand essentials via court QR", description: "QR on court wall → opens 'Add more shuttles / water / grip tape'. Staff delivers within 5 min.",
    surface: ["mobile", "api", "shared-types"], userValue: "No more running to the shop mid-rally." },
  { id: "essentials-subscription-bag", track: RoadmapTrack.VENUE_ESSENTIALS, phase: 4,
    title: "\"My Kit Bag\" subscription: recurring racket stringing + shuttle plan", description: "₹999/mo → 2 restrings + 4 shuttle tubes + priority court 10% off.",
    surface: ["mobile", "api", "billing"], userValue: "Power players save >30% vs a la carte. Predictable revenue." },

  { id: "discover-near-me", track: RoadmapTrack.DISCOVERABILITY, phase: 2,
    title: "\"Near Me\" geo search + map view (PostGIS)", description: "Location permissions → 5km radius venues sorted by distance + price.",
    surface: ["mobile", "api"], userValue: "Court discovery in 2 taps, not a long filter session." },
  { id: "discover-deals", track: RoadmapTrack.DISCOVERABILITY, phase: 3,
    title: "Happy-hour slots + off-peak discount chips", description: "6am-9am / 2pm-5pm marked '25% OFF' badges on slot picker.",
    surface: ["mobile", "api"], userValue: "Users try new venues; venues fill empty off-peak slots." },
  { id: "discover-bundle", track: RoadmapTrack.DISCOVERABILITY, phase: 3,
    title: "\"Play + Essentials\" combo bundles", description: "1h badminton + 2 rackets + 1 shuttle tube = flat ₹599 instead of ₹680.",
    surface: ["mobile", "api"], userValue: "Single-click perfect booking; price anchor nudges add-on conversion." },

  { id: "engage-reminders", track: RoadmapTrack.ENGAGEMENT, phase: 2,
    title: "Push + WhatsApp booking reminders (24h / 2h / 15m)", description: "FCM tokens → reminders + 'Tap to add shuttles' CTA inside.",
    surface: ["mobile", "api", "notifications"], userValue: "Nobody forgets. Less show-rate loss for venues." },
  { id: "engage-referral", track: RoadmapTrack.ENGAGEMENT, phase: 3,
    title: "Refer-a-friend wallet credits", description: "Refer → both get ₹200 on friend's first confirmed booking.",
    surface: ["mobile", "api"], userValue: "Organic growth loop, CAC drop." },
  { id: "engage-badges", track: RoadmapTrack.ENGAGEMENT, phase: 3,
    title: "Play badges: Weekly Warrior, Racket Rookie, Weekend Champion", description: "Gamified unlocks tied to booking count + venue variety.",
    surface: ["mobile", "api"], userValue: "Stickiness; users come back 'just to level up'." },

  { id: "community-leaderboard", track: RoadmapTrack.COMMUNITY, phase: 4,
    title: "Venue leaderboards + local rankings", description: "Monthly hours-played leaderboard per venue; top-10 get free slot.",
    surface: ["mobile", "api"], userValue: "Healthy competition; venue pride." },
  { id: "community-find-a-player", track: RoadmapTrack.COMMUNITY, phase: 4,
    title: "\"Find a Player\" for partial groups", description: "Booked 1 court but only 2/4 → post 'Looking for 2 intermediate doubles players' in app.",
    surface: ["mobile", "api", "shared-types"], userValue: "Solves the #1 pain point of casual sport - getting enough people." },

  { id: "wallet-upi-topup", track: RoadmapTrack.WALLET_SUBSCRIPTIONS, phase: 3,
    title: "Playmate Wallet + UPI AutoTopUp", description: "Razorpay UPI autopay; 1-tap checkout in < 2 seconds. Cashback for wallet pays.",
    surface: ["mobile", "api"], userValue: "Fastest checkout path; repeat purchase rate jumps." },
  { id: "wallet-membership", track: RoadmapTrack.WALLET_SUBSCRIPTIONS, phase: 3,
    title: "Playmate Prime: ₹499/mo flat 10% off + 2h free court credit", description: "Subscription membership - Netflix-style for your sports life.",
    surface: ["mobile", "api"], userValue: "High LTV anchor; price moat vs Playo/District." },

  { id: "owner-occupancy", track: RoadmapTrack.VENUE_OWNER_DASHBOARD, phase: 3,
    title: "Venue Owner dashboard: occupancy heatmap + revenue charts", description: "Owner app / admin-web: which slots are undersold? Should I drop price Tue 3pm?",
    surface: ["api", "admin-web"], userValue: "Venue owners earn more, so they stay loyal to Playmate vs listing elsewhere." },
  { id: "owner-staff-scan", track: RoadmapTrack.VENUE_ESSENTIALS, phase: 3,
    title: "Staff tablet: 'Mark delivered' + quick item scan", description: "Pro shop marks racket picked up / returned in 1 tap.",
    surface: ["admin-web"], userValue: "Operationalises the Essentials concept in real venues." },

  { id: "proshop-marketplace", track: RoadmapTrack.B2B_PRO_SHOP, phase: 4,
    title: "Pro Shop Marketplace: venue owners source stock via Playmate B2B", description: "Yonex / Li-Ning wholesale catalog + bulk-ship to venues; earn spread.",
    surface: ["admin-web", "api"], userValue: "Monetise the supply side; lock venues in as B2B customers." },
];

