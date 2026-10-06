/**
 * Shopping Cart Database Schema
 *
 * Models user shopping carts and their line items.
 *
 * Models:
 * - carts:       Top-level cart container — one per user.
 * - cart_items:  Individual product variant line items inside a cart.
 *
 * Relationships:
 * - carts belongs to users (userId) — each user has a cart.
 *   Deleting a user cascades and removes their cart.
 * - cart_items belongs to carts (cartId) — line items live inside a cart.
 *   Deleting a cart cascades and removes its line items.
 * - cart_items belongs to productVariants (variantId) — each line item references
 *   a product variant. Deleting a variant cascades and removes its cart items.
 *
 * Database Guarantees:
 * - Primary keys: carts.id, cart_items.id (both UUID, auto-generated)
 * - NOT NULL:
 *   • carts: userId, createdAt, updatedAt
 *   • cart_items: cartId, variantId, quantity, createdAt, updatedAt
 * - Cascades:
 *   • carts.userId ON DELETE CASCADE — removing a user also removes their cart
 *   • cart_items.cartId ON DELETE CASCADE — removing a cart also removes its items
 *   • cart_items.variantId ON DELETE CASCADE — removing a variant also removes it from all carts
 */
import {
  pgTable,
  timestamp,
  uuid,
  integer,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { productVariants } from "./product-variants";

export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().defaultRandom(), // Unique cart identifier
  userId: uuid("user_id") // FK to the user who owns this cart
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }) // Timestamp when the cart was first created
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }) // Timestamp of last cart modification
    .defaultNow()
    .notNull(),
});

export const cartItems = pgTable("cart_items", {
  id: uuid("id").primaryKey().defaultRandom(), // Unique cart line-item identifier
  cartId: uuid("cart_id") // FK to the parent cart that contains this line item
    .notNull()
    .references(() => carts.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id") // FK to the product variant being added to cart
    .notNull()
    .references(() => productVariants.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1), // How many units of the variant are in the cart
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }) // Timestamp when the item was first added to the cart
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }) // Timestamp of last quantity/update for this line item
    .defaultNow()
    .notNull(),
});

export type Cart = typeof carts.$inferSelect; // Select/return type for cart rows
export type NewCart = typeof carts.$inferInsert; // Insert/create type for cart rows
export type CartItem = typeof cartItems.$inferSelect; // Select/return type for cart item rows
export type NewCartItem = typeof cartItems.$inferInsert; // Insert/create type for cart item rows
