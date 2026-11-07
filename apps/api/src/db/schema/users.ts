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
  integer,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Authorization role assigned to each user account, controls feature access
export const userRoleEnum = pgEnum("user_role", [
  "USER",
  "ADMIN",
  "VENUE_OWNER",
  "SELLER",
]);

export const userVisibilityEnum = pgEnum("user_visibility", ["PUBLIC", "FRIENDS", "PRIVATE"]);

// Core user identity plus player-facing profile and trust metadata.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: varchar("phone", { length: 20 }),
  avatarUrl: text("avatar_url"),
  role: userRoleEnum("role").default("USER").notNull(),
  profile: jsonb("profile").default({}),
  bio: text("bio"),
  homeCity: text("home_city"),
  homeState: text("home_state"),
  preferredSports: jsonb("preferred_sports").$type<string[]>().default([]).notNull(),
  skillLevels: jsonb("skill_levels").$type<Record<string, string>>().default({}).notNull(),
  preferredTimes: jsonb("preferred_times").$type<string[]>().default([]).notNull(),
  profileVisibility: userVisibilityEnum("profile_visibility").default("PUBLIC").notNull(),
  gamesVisibility: userVisibilityEnum("games_visibility").default("FRIENDS").notNull(),
  calendarVisibility: userVisibilityEnum("calendar_visibility").default("PRIVATE").notNull(),
  reliabilityScore: integer("reliability_score").default(100).notNull(),
  completedGames: integer("completed_games").default(0).notNull(),
  noShowCount: integer("no_show_count").default(0).notNull(),
  lateCancelCount: integer("late_cancel_count").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
});

export const friendshipStatusEnum = pgEnum("friendship_status", ["PENDING", "ACCEPTED", "DECLINED"]);
export const friendships = pgTable("friendships", {
  id: uuid("id").primaryKey().defaultRandom(),
  requesterId: uuid("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  addresseeId: uuid("addressee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: friendshipStatusEnum("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniquePair: uniqueIndex("friendships_pair_unique").on(table.requesterId, table.addresseeId),
  noSelfRequest: check("friendships_no_self", sql`${table.requesterId} <> ${table.addresseeId}`),
}));

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
export const userReportTargetEnum = pgEnum("user_report_target", ["USER", "GAME", "REVIEW", "MESSAGE"]);

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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
