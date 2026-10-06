/**
 * @file court-slots.ts
 * @description Defines the `court_slots` table — time-bounded availability windows for a court that can be booked.
 *
 * Key Relationships:
 * - FK: `courtId` -> `courts.id` (NOT NULL, CASCADE delete: deleting a court deletes all its slots)
 * - FK target: `bookings.courtSlotId` (each booking consumes exactly one slot)
 *
 * DB Guarantees:
 * - Primary key: `id` (UUID v4, auto-generated)
 * - Unique composite index `court_slots_unique`: (courtId, date, startTime, endTime)
 *   — prevents duplicate overlapping slots on the same court on the same day
 * - Required fields: `courtId`, `date`, `startTime`, `endTime`, `isAvailable`, `price`
 * - Audit timestamps: `createdAt`, `updatedAt` (both auto-set, timezone-aware)
 * - No soft-delete: rows are hard-deleted; availability is toggled via `isAvailable`
 */
import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { courts } from "./courts";

// A specific time slot on a specific court that can be booked (or marked unavailable)
export const courtSlots = pgTable(
  "court_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),         // Surrogate primary key, UUID v4 generated at insert
    courtId: uuid("court_id")                            // FK to courts — the court this availability window belongs to
      .notNull()
      .references(() => courts.id, { onDelete: "cascade" }),
    date: date("date").notNull(),                        // Calendar date this slot is for (YYYY-MM-DD, no time / timezone)
    startTime: text("start_time").notNull(),             // Inclusive start of the slot as "HH:mm" 24h local time
    endTime: text("end_time").notNull(),                 // Exclusive end of the slot as "HH:mm" 24h local time
    isAvailable: boolean("is_available").default(true).notNull(), // Whether this slot is currently open for booking
    price: integer("price").notNull().default(0),        // Booking cost for this exact slot, in smallest currency unit
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })  // Timestamp when slot record was created
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })  // Timestamp of last mutation to this row
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // DB-level uniqueness: cannot insert two slots on the same court with identical date/time bounds
    uniqueSlot: uniqueIndex("court_slots_unique").on(
      table.courtId,
      table.date,
      table.startTime,
      table.endTime,
    ),
  }),
);

export type CourtSlot = typeof courtSlots.$inferSelect;   // TypeScript type for a fully selected court slot row
export type NewCourtSlot = typeof courtSlots.$inferInsert; // TypeScript type for an insert payload
