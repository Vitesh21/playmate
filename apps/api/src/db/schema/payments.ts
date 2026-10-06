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

export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "RAZORPAY",
]);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  amount: integer("amount").notNull(),
  method: paymentMethodEnum("method").default("RAZORPAY").notNull(),
  status: paymentStatusEnum("status").default("PENDING").notNull(),
  transactionId: text("transaction_id"),
  gatewayResponse: jsonb("gateway_response"),
  orderId: uuid("order_id").references(() => orders.id),
  bookingId: uuid("booking_id").references(() => bookings.id),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
