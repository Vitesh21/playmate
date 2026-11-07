import { index, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";
import { venues } from "./venues";

export const venueFavorites = pgTable("venue_favorites", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  venueId: uuid("venue_id").notNull().references(() => venues.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueFavorite: uniqueIndex("venue_favorites_user_venue_unique").on(table.userId, table.venueId),
  userLookup: index("venue_favorites_user_idx").on(table.userId, table.createdAt),
}));
