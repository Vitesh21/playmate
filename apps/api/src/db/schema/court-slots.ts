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

export const courtSlots = pgTable(
  "court_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courtId: uuid("court_id")
      .notNull()
      .references(() => courts.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    isAvailable: boolean("is_available").default(true).notNull(),
    price: integer("price").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uniqueSlot: uniqueIndex("court_slots_unique").on(
      table.courtId,
      table.date,
      table.startTime,
      table.endTime,
    ),
  }),
);

export type CourtSlot = typeof courtSlots.$inferSelect;
export type NewCourtSlot = typeof courtSlots.$inferInsert;
