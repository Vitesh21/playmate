/**
 * @file on-demand-orders.ts
 * @description `on_demand_orders` table — mid-session restock orders a user
 *              places from the court-side QR scan flow. They arrive at the
 *              court independent of any pre-booked essentials.
 *
 * Example: user finishes rackets / shuttles at 6:45pm during a 6–8pm badminton
 * booking. They scan the court QR, add extra shuttles + grips, pay inline via
 * Razorpay → row appears here and venue staff gets a push notification.
 *
 * Relationships:
 * - FK: `bookingId` -> bookings.id (nullable — allows on-demand orders even
 *   outside a booking, e.g. a walk-in)
 * - FK: `userId`    -> users.id    (who placed the order)
 * - FK: `paymentId` -> payments.id (nullable until captured)
 * - Parent of: `on_demand_order_items.orderId` (cascade delete)
 */
import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { bookings } from "./bookings";
import { payments } from "./payments";

export const onDemandOrderStatusEnum = pgEnum("on_demand_order_status", [
  "PENDING",    // Created, not yet paid
  "PLACED",     // Payment captured, waiting for staff
  "PREPARING",  // Staff accepted, packing the items
  "OUT_FOR_DELIVERY", // Staff on the way to court
  "DELIVERED",  // Items handed over to customer
  "CANCELLED",  // Cancelled before fulfillment (may trigger refund)
  "REFUNDED",   // Refund processed
]);

// Top-level on-demand order header
export const onDemandOrders = pgTable("on_demand_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id").references(() => bookings.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  status: onDemandOrderStatusEnum("status").default("PENDING").notNull(),
  totalAmount: integer("total_amount").notNull(),
  deliveryNote: text("delivery_note"),
  courtNumber: text("court_number"),
  paymentId: uuid("payment_id").references(() => payments.id),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  totalAmountNonNegative: { check: `total_amount >= 0` },
}));

export type OnDemandOrder = typeof onDemandOrders.$inferSelect;
export type NewOnDemandOrder = typeof onDemandOrders.$inferInsert;
