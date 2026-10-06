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

export const venues = pgTable("venues", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  sportId: uuid("sport_id")
    .notNull()
    .references(() => sports.id),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  pincode: text("pincode").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 6 }),
  longitude: decimal("longitude", { precision: 10, scale: 6 }),
  phone: text("phone"),
  email: text("email"),
  images: jsonb("images").$type<string[]>().default([]),
  amenities: jsonb("amenities").$type<string[]>().default([]),
  operatingHours: jsonb("operating_hours")
    .$type<
      Array<{
        day: number;
        openTime: string;
        closeTime: string;
        isClosed: boolean;
      }>
    >()
    .default([]),
  isActive: boolean("is_active").default(true).notNull(),
  ownerId: uuid("owner_id").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Venue = typeof venues.$inferSelect;
export type NewVenue = typeof venues.$inferInsert;
