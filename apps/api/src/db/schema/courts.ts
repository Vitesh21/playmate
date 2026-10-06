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

export const courts = pgTable("courts", {
  id: uuid("id").primaryKey().defaultRandom(),
  venueId: uuid("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type"),
  surface: text("surface"),
  hourlyRate: integer("hourly_rate").notNull().default(0),
  images: jsonb("images").$type<string[]>().default([]),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Court = typeof courts.$inferSelect;
export type NewCourt = typeof courts.$inferInsert;
