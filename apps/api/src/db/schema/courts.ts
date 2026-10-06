/**
 * @file courts.ts
 * @description Defines the `courts` table — individual bookable playing surfaces/areas inside a venue.
 *
 * Key Relationships:
 * - FK: `venueId` -> `venues.id` (NOT NULL, CASCADE delete: deleting a venue deletes its courts)
 * - Parent of: `court_slots.courtId` (CASCADE delete: deleting a court deletes its slots)
 *
 * DB Guarantees:
 * - Primary key: `id` (UUID v4, auto-generated)
 * - Required fields: `venueId`, `name`, `hourlyRate`
 * - hourlyRate defaults to 0 (free) but must be explicitly set
 * - Soft-delete pattern: NOT used — `isActive` flag toggles bookability
 * - Audit timestamps: `createdAt`, `updatedAt` (both auto-set, timezone-aware)
 */
import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";
import { venues } from "./venues";

// A single bookable court / pitch / playing area belonging to a venue
export const courts = pgTable("courts", {
  id: uuid("id").primaryKey().defaultRandom(),           // Surrogate primary key, UUID v4 generated at insert
  venueId: uuid("venue_id")                              // FK to venues — the parent venue that contains this court
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  name: text("name").notNull(),                          // Display name of the court (e.g. "Court A", "Back Pitch 1")
  description: text("description"),                      // Optional notes about this specific court
  type: text("type"),                                    // Sub-type (e.g. "Indoor", "Outdoor", "Synthetic", "Grass")
  surface: text("surface"),                              // Playing surface material (e.g. "Wood", "Clay", "Astroturf")
  hourlyRate: integer("hourly_rate").notNull().default(0), // Base booking price per hour, in smallest currency unit (paise/cents)
  images: jsonb("images").$type<string[]>().default([]), // Array of public image URLs for this specific court
  isActive: boolean("is_active").default(true).notNull(),// Toggle: when false, court is hidden and no new slots can be booked
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })  // Timestamp when court record was created
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })  // Timestamp of last mutation to this row
    .defaultNow()
    .notNull(),
});

export type Court = typeof courts.$inferSelect;   // TypeScript type for a fully selected court row
export type NewCourt = typeof courts.$inferInsert; // TypeScript type for an insert payload
