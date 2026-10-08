/**
 * @file booking-essentials.ts
 * @description Join table `booking_essentials` linking a pre-booked reservation
 *              (bookings) to the venue inventory items (venue_essentials) the
 *              user requested be brought to their court on arrival.
 *
 * Design notes:
 * - Every row contains a PRICE SNAPSHOT (`unitPriceSnapshot`, `lineTotal`)
 *   because a venue may edit the price after booking — the customer pays
 *   the price as it was at checkout time.
 * - `quantity` is bounded by the CHECK `quantity > 0` AND by `max_per_booking`
 *   on the parent venue_essentials (enforced inside the service transaction).
 * - `durationHours` only applies when `pricingModelSnapshot = PER_HOUR`.
 *
 * Relationships:
 * - FK: `bookingId`         -> bookings.id            (ON DELETE CASCADE)
 * - FK: `venueEssentialId`  -> venue_essentials.id
 */
import {
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  integer,
  text,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { bookings } from "./bookings";
import { venueEssentials } from "./venue-essentials";

// Fulfillment lifecycle — used by venue staff to know what still needs to be
// delivered to which court.
export const essentialFulfillmentStatusEnum = pgEnum(
  "essential_fulfillment_status",
  ["PENDING", "PREPARED", "DELIVERED", "RETURNED", "CANCELLED"],
);

// One line-item of a venue-essential attached to a booking
export const bookingEssentials = pgTable("booking_essentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  venueEssentialId: uuid("venue_essential_id")
    .notNull()
    .references(() => venueEssentials.id),
  quantity: integer("quantity").notNull(),
  durationHours: integer("duration_hours"),
  unitPriceSnapshot: integer("unit_price_snapshot").notNull(),
  lineTotal: integer("line_total").notNull(),
  nameSnapshot: text("name_snapshot").notNull(),
  typeSnapshot: text("type_snapshot").notNull(),
  pricingModelSnapshot: text("pricing_model_snapshot").notNull(),
  fulfillmentStatus: essentialFulfillmentStatusEnum("fulfillment_status")
    .default("PENDING")
    .notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  bookingEssentialUnique: uniqueIndex("booking_essentials_unique").on(
    table.bookingId,
    table.venueEssentialId,
  ),
  quantityPositive: check("booking_essential_qty_positive", sql`quantity > 0`),
  durationNonNegative: check(
    "booking_essential_duration",
    sql`duration_hours IS NULL OR duration_hours > 0`,
  ),
  unitPriceNonNegative: check("booking_essential_unit_price", sql`unit_price_snapshot >= 0`),
  lineTotalNonNegative: check("booking_essential_line_total", sql`line_total >= 0`),
}));

export type BookingEssential = typeof bookingEssentials.$inferSelect;
export type NewBookingEssential = typeof bookingEssentials.$inferInsert;
