/**
 * @file sports.ts
 * @description Defines the `sports` lookup table for categorizing venues by sport type.
 *
 * Key Relationships:
 * - FK target: `venues.sportId` points here (each venue belongs to exactly one sport)
 *
 * DB Guarantees:
 * - Primary key: `id` (UUID v4, auto-generated)
 * - Unique constraint: `slug` (URL-safe identifier, globally unique and required)
 * - Soft-delete pattern: NOT used — `isActive` flag toggles visibility instead
 * - Audit timestamps: `createdAt`, `updatedAt` (both auto-set, timezone-aware)
 */
import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";

// Lookup / catalog table of supported sports (e.g. "Badminton", "Tennis", "Cricket")
export const sports = pgTable("sports", {
  id: uuid("id").primaryKey().defaultRandom(),           // Surrogate primary key, UUID v4 generated at insert
  name: text("name").notNull(),                          // Human-readable sport name (e.g. "Table Tennis")
  slug: text("slug").unique().notNull(),                 // URL-safe, kebab-case unique identifier (e.g. "table-tennis")
  description: text("description"),                      // Optional longer-form description of the sport
  iconUrl: text("icon_url"),                             // Public URL to an icon / logo image for this sport
  isActive: boolean("is_active").default(true).notNull(),// Toggle: when false, sport is hidden from UI & new venues
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })  // Timestamp when sport record was created
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })  // Timestamp of last mutation to this row
    .defaultNow()
    .notNull(),
});

export type Sport = typeof sports.$inferSelect;   // TypeScript type for a fully selected sport row
export type NewSport = typeof sports.$inferInsert; // TypeScript type for an insert payload
