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
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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

export const userBlocks = pgTable("user_blocks", {
  id: uuid("id").primaryKey().defaultRandom(),
  blockerId: uuid("blocker_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  blockedUserId: uuid("blocked_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueBlock: uniqueIndex("user_blocks_pair_unique").on(table.blockerId, table.blockedUserId),
  noSelfBlock: check("user_blocks_no_self", sql`${table.blockerId} <> ${table.blockedUserId}`),
}));

export const userReportStatusEnum = pgEnum("user_report_status", ["OPEN", "REVIEWED", "ACTIONED", "DISMISSED"]);
export const userReportTargetEnum = pgEnum("user_report_target", ["USER", "GAME", "REVIEW"]);

export const userReports = pgTable("user_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: uuid("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetUserId: uuid("target_user_id").references(() => users.id, { onDelete: "set null" }),
  targetType: userReportTargetEnum("target_type").notNull(),
  targetId: text("target_id").notNull(),
  reason: text("reason").notNull(),
  status: userReportStatusEnum("status").notNull().default("OPEN"),
  resolutionNote: text("resolution_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;   // TypeScript type for a fully selected user row
export type NewUser = typeof users.$inferInsert; // TypeScript type for an insert payload (excludes auto-gen cols)
