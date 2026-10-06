/**
 * Orders Database Schema
 *
 * Models customer purchase orders and their individual line items.
 *
 * Enums:
 * - orderStatusEnum: Lifecycle states an order can move through
 *     (PENDING → CONFIRMED → SHIPPED → DELIVERED, or CANCELLED / REFUNDED).
 *
 * Models:
 * - orders:      Top-level order header — billing, totals, status, shipping address.
 * - order_items: Individual product variant line items that make up an order,
 *                with a snapshot of the unit/total price at purchase time.
 * - addressType: Reusable JSON shape object describing a postal address
 *                (used for shippingAddress and billingAddress JSONB columns).
 *
 * Relationships:
 * - orders belongs to users (userId) — the customer who placed the order.
 * - orders references payments (paymentId) — optional link to the payment record.
 * - order_items belongs to orders (orderId) — line items are part of one order.
 *   Deleting an order cascades and removes its line items.
 * - order_items belongs to productVariants (variantId) — each line item points
 *   to the product variant purchased.
 *
 * Database Guarantees:
 * - Primary keys: orders.id, order_items.id (both UUID, auto-generated)
 * - Unique enum: order_status is a strict Postgres enum of 6 values.
 * - NOT NULL:
 *   • orders: userId, status, subtotal, tax, shipping, discount, totalAmount,
 *             shippingAddress, createdAt, updatedAt
 *   • order_items: orderId, variantId, quantity, unitPrice, totalPrice
 * - Cascade:
 *   • order_items.orderId ON DELETE CASCADE — deleting an order also deletes its items.
 * - No cascade on userId/paymentId/variantId (historical orders are preserved
 *   even if the related user/payment/variant is removed).
 */
import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { productVariants } from "./product-variants";
import { payments } from "./payments";

export const orderStatusEnum = pgEnum("order_status", [ // Order lifecycle state enum
  "PENDING", // Order created but not yet confirmed/paid
  "CONFIRMED", // Payment received, order approved for fulfillment
  "SHIPPED", // Package dispatched to customer
  "DELIVERED", // Package successfully delivered
  "CANCELLED", // Order cancelled before shipment
  "REFUNDED", // Order refunded after being completed/cancelled
]);

export const addressType = { // Reusable JSON column schema for shipping/billing addresses
  firstName: text("first_name").notNull(), // Recipient given name
  lastName: text("last_name").notNull(), // Recipient family name
  phone: text("phone").notNull(), // Recipient contact phone number
  line1: text("line1").notNull(), // Primary street address (house/building/area)
  line2: text("line2"), // Secondary address detail (apt/suite/landmark)
  city: text("city").notNull(), // City / town
  state: text("state").notNull(), // State / province / region
  pincode: text("pincode").notNull(), // Postal / ZIP code
  country: text("country").notNull(), // Country name or ISO code
};

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(), // Unique order identifier
  userId: uuid("user_id") // FK to the user who placed this order
    .notNull()
    .references(() => users.id),
  status: orderStatusEnum("status").default("PENDING").notNull(), // Current lifecycle status of the order
  subtotal: integer("subtotal").notNull().default(0), // Sum of all line items (before tax/shipping/discount), in smallest currency unit (e.g. paise)
  tax: integer("tax").notNull().default(0), // Taxes applied, in smallest currency unit
  shipping: integer("shipping").notNull().default(0), // Shipping/handling cost, in smallest currency unit
  discount: integer("discount").notNull().default(0), // Applied discount amount, in smallest currency unit
  totalAmount: integer("total_amount").notNull(), // Final order total (subtotal + tax + shipping - discount), in smallest currency unit
  shippingAddress: jsonb("shipping_address").notNull(), // Snapshot of the shipping address JSON (matches addressType shape)
  billingAddress: jsonb("billing_address"), // Optional snapshot of the billing address JSON (matches addressType shape)
  trackingNumber: text("tracking_number"), // Carrier shipment tracking number (once shipped)
  paymentId: uuid("payment_id").references(() => payments.id), // Optional FK to the payment record for this order
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }) // Timestamp when the order was placed
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }) // Timestamp of last order/status update
    .defaultNow()
    .notNull(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(), // Unique order line-item identifier
  orderId: uuid("order_id") // FK to the parent order this line item belongs to
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id") // FK to the product variant purchased
    .notNull()
    .references(() => productVariants.id),
  quantity: integer("quantity").notNull(), // Number of units purchased for this variant
  unitPrice: integer("unit_price").notNull(), // Per-unit price snapshot at time of purchase (smallest currency unit)
  totalPrice: integer("total_price").notNull(), // Line total (unitPrice × quantity) snapshot (smallest currency unit)
});

export type Order = typeof orders.$inferSelect; // Select/return type for order rows
export type NewOrder = typeof orders.$inferInsert; // Insert/create type for order rows
export type OrderItem = typeof orderItems.$inferSelect; // Select/return type for order item rows
export type NewOrderItem = typeof orderItems.$inferInsert; // Insert/create type for order item rows
