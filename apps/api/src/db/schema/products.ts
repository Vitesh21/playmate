/**
 * @file products.ts
 * @description Defines the `products` table — marketplace product listings sold by sellers.
 *
 * Key Relationships:
 * - FK: `categoryId` -> `categories.id` (NOT NULL, no cascade — deleting a category blocks if products exist)
 * - FK: `sellerId` -> `users.id` (nullable — SELLER user who listed the product; no cascade)
 * - Parent of: `product_variants.productId` (CASCADE delete: deleting a product deletes its variants)
 *
 * DB Guarantees:
 * - Primary key: `id` (UUID v4, auto-generated)
 * - Unique constraint: `slug` (URL-safe product identifier, globally unique and required)
 * - Required fields: `name`, `slug`, `description`, `categoryId`, `isActive`, `reviewCount`
 * - Rating precision: `averageRating` stored as DECIMAL(2,1) → values 0.0 – 9.9
 * - Soft-delete pattern: NOT used — `isActive` flag delists products instead
 * - Audit timestamps: `createdAt`, `updatedAt` (both auto-set, timezone-aware)
 */
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

// A marketplace product listing — the parent entity for one or more SKU-level variants
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),           // Surrogate primary key, UUID v4 generated at insert
  name: text("name").notNull(),                          // Product title shown in search results and detail pages
  slug: text("slug").unique().notNull(),                 // URL-safe, kebab-case unique identifier (e.g. "yonex-astrox-99")
  description: text("description").notNull(),            // Long-form product description (marketing text, specs, etc.)
  categoryId: uuid("category_id")                        // FK to categories — which product category this listing belongs to
    .notNull()
    .references(() => categories.id),
  brand: text("brand"),                                  // Optional brand / manufacturer name (e.g. "Yonex", "Nike")
  images: jsonb("images").$type<string[]>().default([]), // Ordered array of public image URLs (primary image = first element)
  isActive: boolean("is_active").default(true).notNull(),// Toggle: when false, product is delisted from the marketplace
  averageRating: decimal("average_rating", { precision: 2, scale: 1 }), // Rolling average customer rating, 1 decimal place (0.0–5.0)
  reviewCount: integer("review_count").default(0).notNull(), // Running count of approved reviews used to weight the average
  sellerId: uuid("seller_id").references(() => users.id), // FK to users — the SELLER account that owns this product listing
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })  // Timestamp when product record was created
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })  // Timestamp of last mutation to this row
    .defaultNow()
    .notNull(),
});

export type Product = typeof products.$inferSelect;   // TypeScript type for a fully selected product row
export type NewProduct = typeof products.$inferInsert; // TypeScript type for an insert payload
