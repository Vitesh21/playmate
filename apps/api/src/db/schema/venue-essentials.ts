/**
 * @file venue-essentials.ts
 * @description Defines the `venue_essentials` table — rentable / sellable court-side
 *              inventory items (rackets, shuttles, grips, water etc.) that users can
 *              attach to a booking (pre-checkout) or order mid-session on-demand.
 *
 * Key Relationships:
 * - FK: `venueId` -> `venues.id`  (the venue whose stock pool this essential belongs to)
 * - FK: `sportId` -> `sports.id`  (the sport this essential is for — enables per-sport recommendations)
 * - Parent of: `booking_essentials.venueEssentialId`
 * - Parent of: `on_demand_order_items.venueEssentialId`
 *
 * DB Guarantees:
 * - UUID PK, auto-generated
 * - Postgres enums for `essential_type` (RENT | SALE | ADDON) and
 *   `essential_pricing_model` (PER_HOUR | PER_BOOKING | FIXED)
 * - Compound uniqueness: `venueId + name` prevents duplicate listings inside the same venue
 * - Stock never goes negative: enforced by CHECK constraint `stock_quantity >= 0` AND
 *   by application-level transactions in the service layer
 * - `maxPerBooking` guards against a single booking exhausting all stock
 */
import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  jsonb,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { venues } from "./venues";
import { sports } from "./sports";

// Classification of how the item is consumed
//   RENT     – user borrows for the booking duration, returned after
//   SALE     – user purchases outright, taken from stock permanently
//   ADDON    – complimentary or surcharged add-on bundled with booking
export const essentialTypeEnum = pgEnum("essential_type", [
  "RENT",
  "SALE",
  "ADDON",
]);

// How the unit price is computed when attached to a booking or on-demand order
//   PER_HOUR    – price * booking_duration_hours
//   PER_BOOKING – flat fee regardless of duration
//   FIXED       – exact price as listed (used for SALE items and on-demand)
export const essentialPricingModelEnum = pgEnum("essential_pricing_model", [
  "PER_HOUR",
  "PER_BOOKING",
  "FIXED",
]);

// A single rentable/sellable item tracked against a venue's inventory pool
export const venueEssentials = pgTable("venue_essentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  venueId: uuid("venue_id")
    .notNull()
    .references(() => venues.id),
  sportId: uuid("sport_id")
    .notNull()
    .references(() => sports.id),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  type: essentialTypeEnum("type").notNull(),
  pricingModel: essentialPricingModelEnum("pricing_model").notNull(),
  price: integer("price").notNull(),
  compareAtPrice: integer("compare_at_price"),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  maxPerBooking: integer("max_per_booking").notNull().default(4),
  tags: jsonb("tags").$type<string[]>().default([]),
  categories: jsonb("categories").$type<string[]>().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  venueNameUnique: uniqueIndex("venue_essentials_venue_name_unique").on(table.venueId, table.name),
  stockNonNegative: check("venue_essentials_stock_non_negative", sql`stock_quantity >= 0`),
  priceNonNegative: check("venue_essentials_price_non_negative", sql`price >= 0`),
  maxPerBookingPositive: check("venue_essentials_max_per_booking_positive", sql`max_per_booking >= 1`),
}));

export type VenueEssential = typeof venueEssentials.$inferSelect;
export type NewVenueEssential = typeof venueEssentials.$inferInsert;
