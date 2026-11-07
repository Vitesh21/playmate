import { boolean, check, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const groupRoleEnum = pgEnum("group_role", ["ADMIN", "MEMBER"]);

export const playerGroups = pgTable("player_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  photoUrl: text("photo_url"),
  rules: text("rules"),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const groupMembers = pgTable("group_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => playerGroups.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: groupRoleEnum("role").notNull().default("MEMBER"),
  isMuted: boolean("is_muted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueMembership: uniqueIndex("group_members_group_user_unique").on(table.groupId, table.userId),
  userLookup: index("group_members_user_idx").on(table.userId),
}));

export const groupMessages = pgTable("group_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => playerGroups.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  groupTimeline: index("group_messages_timeline_idx").on(table.groupId, table.createdAt),
  nonemptyBody: check("group_messages_nonempty", sql`length(trim(${table.body})) > 0`),
}));
