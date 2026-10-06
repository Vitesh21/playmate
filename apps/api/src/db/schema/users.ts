/**
 * @file users.ts
 * @description Defines the `users` table schema representing platform users across all roles.
 *
 * Key Relationships:
 * - Referenced by: `venues.ownerId` (venue ownership)
 * - Referenced by: `bookings.userId` (who made the booking)
 * - Referenced by: `products.sellerId` (product seller)
 *
 * DB Guarantees:
 * - Primary key: `id` (UUID v4, auto-generated)
 * - Unique constraint: `email` (globally unique, nullable to support OAuth flows without email)
 * - Role enforcement via Postgres enum `user_role` with default `USER`
 * - Audit timestamps: `createdAt`, `updatedAt` (both auto-set, timezone-aware)
 * - No soft-delete: rows are hard-deleted
 */
import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  jsonb,
} from "drizzle-orm/pg-core";

// Authorization role assigned to each user account, controls feature access
export const userRoleEnum = pgEnum("user_role", [
  "USER",        // Regular customer: can book courts, buy products
  "ADMIN",       // Super admin: full platform access
  "VENUE_OWNER", // Manages venues, courts, and their slots
  "SELLER",      // Lists and manages products for sale in the marketplace
]);

// Core user identity table — one row per registered account on the platform
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),           // Surrogate primary key, UUID v4 generated at insert
  email: text("email").unique(),                         // User's email address, globally unique when set
  firstName: text("first_name"),                         // User's given / first name (display purposes)
  lastName: text("last_name"),                           // User's family / last name (display purposes)
  phone: varchar("phone", { length: 20 }),               // Contact phone number, max 20 chars with country code
  avatarUrl: text("avatar_url"),                         // Public URL to profile avatar / picture image
  role: userRoleEnum("role").default("USER").notNull(),  // Access-control role, defaults to regular USER
  profile: jsonb("profile").default({}),                 // Free-form JSON blob for extended profile metadata
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })  // Timestamp when user record was created
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })  // Timestamp of last mutation to this row
    .defaultNow()
    .notNull(),
});

export type User = typeof users.$inferSelect;   // TypeScript type for a fully selected user row
export type NewUser = typeof users.$inferInsert; // TypeScript type for an insert payload (excludes auto-gen cols)
