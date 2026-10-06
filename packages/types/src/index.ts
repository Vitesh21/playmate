/**
 * @playmate/types — Shared domain types for the entire sports platform.
 *
 * Keep this package free of runtime code: only TypeScript types, interfaces,
 * and string enums (string enums compile to small JS lookup tables, so they
 * are acceptable in a types package).
 *
 * Consumed by:
 *   - apps/web    (Next.js frontend)
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
