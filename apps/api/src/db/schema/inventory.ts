/**
 * Inventory Database Schema
 *
 * Tracks product variant stock levels across warehouses.
 *
 * Model:
 * - Inventory entries represent the stock position for a specific product variant
 *   at a specific warehouse location.
 *
 * Relationships:
 * - Belongs to productVariants (variantId) — each inventory row tracks one variant.
 *   Deleting a variant cascades and removes its associated inventory rows.
 *
 * Database Guarantees:
 * - Primary key: id (UUID, auto-generated)
 * - Unique constraint: (variantId, warehouse) composite unique index — ensures
 *   there is at most one inventory row per variant+warehouse pair, preventing
 *   duplicate stock records for the same location.
 * - NOT NULL: variantId, quantity, reservedQuantity, createdAt, updatedAt
 * - Cascade: variantId ON DELETE CASCADE — deleting a product variant also
 *   removes all inventory records for that variant.
 */
import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { productVariants } from "./product-variants";

export const inventory = pgTable(
  "inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(), // Unique inventory record identifier
    variantId: uuid("variant_id") // FK to the product variant this stock belongs to
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(0), // Current available (unreserved) stock count
    reservedQuantity: integer("reserved_quantity").notNull().default(0), // Stock locked/held for pending orders/checkouts
    warehouse: text("warehouse"), // Optional warehouse/location identifier (null = default/unassigned)
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }) // Timestamp when inventory record was created
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }) // Timestamp of last stock level update
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uniqueVariantWarehouse: uniqueIndex("inventory_variant_warehouse_unique").on( // Prevents duplicate stock rows for the same variant+warehouse pair
      table.variantId,
      table.warehouse,
    ),
  }),
);

export type Inventory = typeof inventory.$inferSelect; // Select/return type for inventory rows
export type NewInventory = typeof inventory.$inferInsert; // Insert/create type for inventory rows
