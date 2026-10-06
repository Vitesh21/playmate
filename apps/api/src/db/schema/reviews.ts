import {
  pgTable,
  text,
  timestamp,
  uuid,
  smallint,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { venues } from "./venues";
import { products } from "./products";

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  rating: smallint("rating").notNull(),
  comment: text("comment"),
  venueId: uuid("venue_id").references(() => venues.id, {
    onDelete: "cascade",
  }),
  productId: uuid("product_id").references(() => products.id, {
    onDelete: "cascade",
  }),
  images: jsonb("images").$type<string[]>().default([]),
  isVerified: boolean("is_verified").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
