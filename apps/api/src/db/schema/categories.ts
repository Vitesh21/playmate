/**
 * @file categories.ts
 * @description Defines the `categories` table — hierarchical product categories for the marketplace.
 *
 * Key Relationships:
 * - Self-referential FK: `parentId` -> `categories.id` (SET NULL on delete — orphaned children become root nodes)
 * - FK target: `products.categoryId` (each product belongs to one category)
 *
 * DB Guarantees:
 * - Primary key: `id` (UUID v4, auto-generated)
 * - Unique constraint: `slug` (URL-safe category identifier, globally unique and required)
 * - Required fields: `name`, `slug`, `isActive`, `sortOrder`
 * - Hierarchy: unlimited depth via self-referential `parentId`; root nodes have NULL parent
 * - Soft-delete pattern: NOT used — `isActive` flag toggles category visibility
 * - Audit timestamps: `createdAt`, `updatedAt` (both auto-set, timezone-aware)
 */
import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
} from "drizzle-orm/pg-core";

// A hierarchical product category (e.g. "Racquets" -> "Badminton Racquets")
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),           // Surrogate primary key, UUID v4 generated at insert
  name: text("name").notNull(),                          // Human-readable category label shown in UI
  slug: text("slug").unique().notNull(),                 // URL-safe, kebab-case unique identifier (e.g. "badminton-racquets")
  description: text("description"),                      // Optional long-form description of the category
  parentId: uuid("parent_id").references(() => categories.id, {  // Self-FK: parent category for nesting, NULL = top-level
    onDelete: "set null",
  }),
  imageUrl: text("image_url"),                           // Public URL to a thumbnail / hero image for this category
  isActive: boolean("is_active").default(true).notNull(),// Toggle: when false, category is hidden from listings
  sortOrder: integer("sort_order").default(0).notNull(), // Display rank within the same parent (ascending, low = first)
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })  // Timestamp when category record was created
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })  // Timestamp of last mutation to this row
    .defaultNow()
    .notNull(),
});

export type Category = typeof categories.$inferSelect;   // TypeScript type for a fully selected category row
export type NewCategory = typeof categories.$inferInsert; // TypeScript type for an insert payload
