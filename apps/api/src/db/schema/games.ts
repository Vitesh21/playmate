import {
  boolean,
  integer,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { venues } from "./venues";
import { sports } from "./sports";

export const gameVisibilityEnum = pgEnum("game_visibility", ["PUBLIC", "PRIVATE"]);
export const gameStatusEnum = pgEnum("game_status", ["OPEN", "FULL", "CANCELLED", "COMPLETED"]);
export const gameJoinStatusEnum = pgEnum("game_join_status", ["REQUESTED", "APPROVED", "DECLINED", "WAITLISTED", "LEFT"]);
export const gameInviteStatusEnum = pgEnum("game_invite_status", ["PENDING", "ACCEPTED", "DECLINED"]);

export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostId: uuid("host_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sportId: uuid("sport_id").notNull().references(() => sports.id),
  venueId: uuid("venue_id").references(() => venues.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  notes: text("notes"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  visibility: gameVisibilityEnum("visibility").notNull().default("PUBLIC"),
  status: gameStatusEnum("status").notNull().default("OPEN"),
  skillMin: text("skill_min"),
  skillMax: text("skill_max"),
  maxPlayers: integer("max_players").notNull(),
  costPerPlayer: integer("cost_per_player").notNull().default(0),
  instantJoin: boolean("instant_join").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const gameParticipants = pgTable("game_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: gameJoinStatusEnum("status").notNull().default("REQUESTED"),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({ uniqueGameUser: uniqueIndex("game_participants_game_user_unique").on(table.gameId, table.userId) }));

export const gameInvites = pgTable("game_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  inviterId: uuid("inviter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  inviteeId: uuid("invitee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: gameInviteStatusEnum("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueGameInvitee: uniqueIndex("game_invites_game_invitee_unique").on(table.gameId, table.inviteeId),
  inviteeStatus: index("game_invites_invitee_status_idx").on(table.inviteeId, table.status),
}));
