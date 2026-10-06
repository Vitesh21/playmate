import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  jsonb,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "USER",
  "ADMIN",
  "VENUE_OWNER",
  "SELLER",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: varchar("phone", { length: 20 }),
  avatarUrl: text("avatar_url"),
  role: userRoleEnum("role").default("USER").notNull(),
  profile: jsonb("profile").default({}),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
