import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  jsonb,
  decimal,
  integer,
} from "drizzle-orm/pg-core";
import { categories } from "./categories";
import { users } from "./users";

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description").notNull(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id),
  brand: text("brand"),
  images: jsonb("images").$type<string[]>().default([]),
  isActive: boolean("is_active").default(true).notNull(),
  averageRating: decimal("average_rating", { precision: 2, scale: 1 }),
  reviewCount: integer("review_count").default(0).notNull(),
  sellerId: uuid("seller_id").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
