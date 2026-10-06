/**
 * Reviews Database Schema
 *
 * Stores user-submitted ratings and comments for either products or venues
 * (a polymorphic review — exactly one of venueId or productId is expected
 *  to be populated per row).
 *
 * Model:
 * - reviews: A single rating + optional comment/images left by a user
 *            against either a product (productId) or a venue (venueId).
 *
 * Relationships:
 * - Belongs to users (userId) — the author of the review.
 *   Deleting a user cascades and removes their reviews.
 * - Optional: belongs to venues (venueId) — if this is a venue review.
 *   Deleting a venue cascades and removes its reviews.
 * - Optional: belongs to products (productId) — if this is a product review.
 *   Deleting a product cascades and removes its reviews.
 *
 * Database Guarantees:
 * - Primary key: id (UUID, auto-generated)
 * - NOT NULL: userId, rating, isVerified, createdAt, updatedAt
 * - Polymorphic target: exactly one of venueId / productId should be non-null
 *   (application-enforced; schema allows both to be nullable independently).
 * - Cascades:
 *   • userId     ON DELETE CASCADE — removing a user also removes their reviews
 *   • venueId    ON DELETE CASCADE — removing a venue also removes its reviews
 *   • productId  ON DELETE CASCADE — removing a product also removes its reviews
 * - rating is a smallint (typically 1–5; range enforced at application level).
 */
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
  id: uuid("id").primaryKey().defaultRandom(), // Unique review identifier
  userId: uuid("user_id") // FK to the user who wrote the review
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  rating: smallint("rating").notNull(), // Star/numeric rating (typically 1–5)
  comment: text("comment"), // Optional written review text
  venueId: uuid("venue_id").references(() => venues.id, { // Optional FK — set if reviewing a venue
    onDelete: "cascade",
  }),
  productId: uuid("product_id").references(() => products.id, { // Optional FK — set if reviewing a product
    onDelete: "cascade",
  }),
  images: jsonb("images").$type<string[]>().default([]), // Array of image URLs attached to the review
  isVerified: boolean("is_verified").default(false).notNull(), // Whether the review is from a verified purchaser/guest
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }) // Timestamp when the review was submitted
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }) // Timestamp of last review edit/update
    .defaultNow()
    .notNull(),
});

export type Review = typeof reviews.$inferSelect; // Select/return type for review rows
export type NewReview = typeof reviews.$inferInsert; // Insert/create type for review rows
