/**
 * @file venues.ts
 * @description Defines the `venues` table representing physical sports facility locations.
 *
 * Key Relationships:
 * - FK: `sportId` -> `sports.id` (venue categorized under one sport, NOT NULL, no cascade)
 * - FK: `ownerId` -> `users.id` (venue owner / manager user, nullable, no cascade)
 * - Parent of: `courts.venueId` (cascade delete: deleting a venue removes its courts)
 *
 * DB Guarantees:
 * - Primary key: `id` (UUID v4, auto-generated)
 * - Unique constraint: `slug` (URL-safe venue identifier, globally unique and required)
 * - Required fields: `name`, `sportId`, `address`, `city`, `state`, `pincode`
 * - Coordinates use DECIMAL(10,6) for sub-meter GPS precision
 * - Soft-delete pattern: NOT used — `isActive` flag toggles listing visibility
 * - Audit timestamps: `createdAt`, `updatedAt` (both auto-set, timezone-aware)
 */
import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  decimal,
  jsonb,
} from "drizzle-orm/pg-core";
import { sports } from "./sports";
import { users } from "./users";

// A physical sports venue (arena, club, ground) that contains one or more courts
export const venues = pgTable("venues", {
  id: uuid("id").primaryKey().defaultRandom(),           // Surrogate primary key, UUID v4 generated at insert
  name: text("name").notNull(),                          // Display name of the venue (e.g. "Downtown Badminton Club")
  slug: text("slug").unique().notNull(),                 // URL-safe unique identifier (e.g. "downtown-badminton-club")
  description: text("description"),                      // Optional long-form description of the venue and its amenities
  sportId: uuid("sport_id")                              // FK to sports — the sport this venue is built for
    .notNull()
    .references(() => sports.id),
  address: text("address").notNull(),                    // Street address line (e.g. "123 Main Street, Suite 4")
  city: text("city").notNull(),                          // City / municipality name
  state: text("state").notNull(),                        // State / province / region name
  pincode: text("pincode").notNull(),                    // Postal / ZIP code string
  latitude: decimal("latitude", { precision: 10, scale: 6 }),   // WGS-84 latitude coordinate, up to 6 decimals (~10cm precision)
  longitude: decimal("longitude", { precision: 10, scale: 6 }), // WGS-84 longitude coordinate
  phone: text("phone"),                                  // Venue contact phone number
  email: text("email"),                                  // Venue contact email address
  images: jsonb("images").$type<string[]>().default([]), // Ordered array of public image URLs showcasing the venue
  amenities: jsonb("amenities").$type<string[]>().default([]), // Array of amenity tags (e.g. "Parking", "AC", "Shower")
  operatingHours: jsonb("operating_hours")               // Weekly operating schedule, one entry per day (0=Sun..6=Sat)
    .$type<
      Array<{
        day: number;           // ISO weekday index (0 Sunday — 6 Saturday)
        openTime: string;      // Opening time as "HH:mm" 24h string
        closeTime: string;     // Closing time as "HH:mm" 24h string
        isClosed: boolean;     // If true, venue is closed on this day
      }>
    >()
    .default([]),
  isActive: boolean("is_active").default(true).notNull(),// Toggle: when false, venue is unlisted & non-bookable
  ownerId: uuid("owner_id").references(() => users.id),  // FK to users — the VENUE_OWNER who manages this venue
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })  // Timestamp when venue record was created
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })  // Timestamp of last mutation to this row
    .defaultNow()
    .notNull(),
});

export type Venue = typeof venues.$inferSelect;   // TypeScript type for a fully selected venue row
export type NewVenue = typeof venues.$inferInsert; // TypeScript type for an insert payload
