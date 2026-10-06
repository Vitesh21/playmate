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

export const bookingStatusEnum = pgEnum("booking_status", [
  "PENDING",
  "CONFIRMED",
  "EXPIRED",
  "CANCELLED",
  "REFUNDED",
]);

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  courtSlotId: uuid("court_slot_id")
    .notNull()
    .references(() => courtSlots.id),
  status: bookingStatusEnum("status").default("PENDING").notNull(),
  totalAmount: integer("total_amount").notNull(),
  expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }),
  paymentId: uuid("payment_id").references(() => payments.id),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
