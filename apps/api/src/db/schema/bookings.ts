/**
 * @file bookings.ts
 * @description Defines the `bookings` table representing a user's reservation of a court time slot.
 *
 * Key Relationships:
 * - FK: `userId` -> `users.id` (NOT NULL, no cascade — bookings preserved even if user is deleted)
 * - FK: `courtSlotId` -> `court_slots.id` (NOT NULL, no cascade — bookings must be manually removed before slot)
 * - FK: `paymentId` -> `payments.id` (nullable — payment may not yet be attached)
 *
 * DB Guarantees:
 * - Primary key: `id` (UUID v4, auto-generated)
 * - Status enforced via Postgres enum `booking_status` starting at `PENDING`
 * - Required fields: `userId`, `courtSlotId`, `status`, `totalAmount`
 * - `expiresAt` is nullable — when set, PENDING bookings past this timestamp should transition to EXPIRED
 * - Audit timestamps: `createdAt`, `updatedAt` (both auto-set, timezone-aware)
 * - No soft-delete: cancelled bookings are kept with `status = CANCELLED` for audit trail
 */
import {
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  integer,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { courtSlots } from "./court-slots";
import { payments } from "./payments";

// Lifecycle state of a booking from creation through fulfillment or cancellation
export const bookingStatusEnum = pgEnum("booking_status", [
  "PENDING",   // Created, awaiting payment or confirmation
  "CONFIRMED", // Paid and/or confirmed — slot is reserved for the user
  "EXPIRED",   // Pending booking passed expiresAt without being confirmed
  "CANCELLED", // Booking cancelled by user or operator
  "REFUNDED",  // Previously confirmed booking has been refunded
]);

// A single reservation linking a user to a specific court slot with payment/booking metadata
export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),           // Surrogate primary key, UUID v4 generated at insert
  userId: uuid("user_id")                                // FK to users — the customer who made this booking
    .notNull()
    .references(() => users.id),
  courtSlotId: uuid("court_slot_id")                     // FK to court_slots — the exact time slot being reserved
    .notNull()
    .references(() => courtSlots.id),
  status: bookingStatusEnum("status").default("PENDING").notNull(), // Current lifecycle state of this booking
  totalAmount: integer("total_amount").notNull(),        // Final charged amount, in smallest currency unit (paise/cents)
  expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }), // Cutoff time for PENDING bookings before auto-expiry
  paymentId: uuid("payment_id").references(() => payments.id), // FK to payments — the transaction that paid for this booking
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })  // Timestamp when booking record was created
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })  // Timestamp of last mutation to this row
    .defaultNow()
    .notNull(),
});

export type Booking = typeof bookings.$inferSelect;   // TypeScript type for a fully selected booking row
export type NewBooking = typeof bookings.$inferInsert; // TypeScript type for an insert payload
