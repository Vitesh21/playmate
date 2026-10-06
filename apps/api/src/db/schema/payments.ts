/**
 * Payments Database Schema
 *
 * Records payment transactions for product orders and venue bookings, including
 * gateway response snapshots for auditing and reconciliation.
 *
 * Enums:
 * - paymentStatusEnum: Current state of the payment
 *     (PENDING → PAID / FAILED, with REFUNDED for post-complete reversals).
 * - paymentMethodEnum: Accepted payment gateways / methods
 *     (currently only RAZORPAY).
 *
 * Model:
 * - payments: A single attempt (or finalised transaction) for one user toward
 *             either an order OR a booking.
 *
 * Relationships:
 * - Belongs to users (userId) — the user who initiated the payment.
 * - Optional reference to orders (orderId) — links the payment to a product order.
 * - Optional reference to bookings (bookingId) — links the payment to a venue booking.
 *   (A single payment is expected to satisfy at most one of orderId / bookingId.)
 *
 * Database Guarantees:
 * - Primary key: id (UUID, auto-generated)
 * - Unique enums: payment_status (4 states), payment_method (RAZORPAY only)
 * - NOT NULL: userId, amount, method, status, createdAt, updatedAt
 * - No ON DELETE cascades on FKs — payment records are retained for audit/history
 *   even if the related user, order, or booking is removed.
 * - Optional FKs (orderId, bookingId) allow the payment row to exist
 *   independently (e.g. a failed or abandoned attempt).
 */
import {
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  integer,
  text,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { orders } from "./orders";
import { bookings } from "./bookings";

export const paymentStatusEnum = pgEnum("payment_status", [ // Payment lifecycle state enum
  "PENDING", // Payment initiated, awaiting gateway confirmation
  "PAID", // Payment successfully captured and confirmed
  "FAILED", // Payment attempt rejected or errored
  "REFUNDED", // Previously PAID amount has been reversed/refunded
]);

export const paymentMethodEnum = pgEnum("payment_method", [ // Payment gateway/provider enum
  "RAZORPAY", // Razorpay Indian payment gateway
]);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(), // Unique payment record identifier
  userId: uuid("user_id") // FK to the user making the payment
    .notNull()
    .references(() => users.id),
  amount: integer("amount").notNull(), // Payment amount in the smallest currency unit (e.g. paise)
  method: paymentMethodEnum("method").default("RAZORPAY").notNull(), // Gateway/provider used for this payment
  status: paymentStatusEnum("status").default("PENDING").notNull(), // Current processing status of the payment
  transactionId: text("transaction_id"), // Gateway-provided unique transaction ID (e.g. Razorpay payment_id)
  gatewayResponse: jsonb("gateway_response"), // Raw response payload snapshot from the payment gateway for audit/debugging
  orderId: uuid("order_id").references(() => orders.id), // Optional FK to the associated product order
  bookingId: uuid("booking_id").references(() => bookings.id), // Optional FK to the associated venue booking
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }) // Timestamp when the payment was initiated/recorded
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }) // Timestamp of last status/gateway update
    .defaultNow()
    .notNull(),
});

export type Payment = typeof payments.$inferSelect; // Select/return type for payment rows
export type NewPayment = typeof payments.$inferInsert; // Insert/create type for payment rows
