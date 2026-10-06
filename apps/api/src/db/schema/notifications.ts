/**
 * Notifications Database Schema
 *
 * Persists in-app user notifications — triggered by bookings, order lifecycle
 * events, payment outcomes, or general platform messages.
 *
 * Enums:
 * - notificationTypeEnum: Semantic category of the notification, used by clients
 *     for iconography, routing, and grouping. Covers booking, order, and payment
 *     events plus a GENERAL catch-all.
 *
 * Model:
 * - notifications: A single message delivered to one user, with optional
 *                  structured payload (data) and a read/unread marker (readAt).
 *
 * Relationships:
 * - Belongs to users (userId) — the recipient of the notification.
 *   Deleting a user cascades and removes all their notifications.
 *
 * Database Guarantees:
 * - Primary key: id (UUID, auto-generated)
 * - Unique enum: notification_type (8 possible values)
 * - NOT NULL: userId, type, title, message, createdAt, updatedAt
 * - Cascade: userId ON DELETE CASCADE — removing a user also removes their
 *            entire notification history.
 * - Nullable readAt means "unread"; a non-null timestamp marks when the user
 *   opened/dismissed the notification.
 */
import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const notificationTypeEnum = pgEnum("notification_type", [ // Notification category enum
  "BOOKING_CONFIRMED", // Venue booking has been confirmed
  "BOOKING_REMINDER", // Upcoming booking reminder (e.g. 24h before)
  "ORDER_CONFIRMED", // Product order has been placed and confirmed
  "ORDER_SHIPPED", // Product order has been dispatched/shipped
  "ORDER_DELIVERED", // Product order has been delivered
  "PAYMENT_SUCCESS", // Payment completed successfully
  "PAYMENT_FAILED", // Payment attempt failed
  "GENERAL", // Generic platform/announcement notification
]);

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(), // Unique notification identifier
  userId: uuid("user_id") // FK to the user receiving this notification
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").default("GENERAL").notNull(), // Semantic category of the notification
  title: text("title").notNull(), // Short notification headline (shown in list)
  message: text("message").notNull(), // Full notification body text
  data: jsonb("data"), // Optional structured payload (e.g. orderId, bookingId, deep-link params)
  readAt: timestamp("read_at", { mode: "date", withTimezone: true }), // When the user marked the notification as read (null = unread)
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }) // Timestamp when the notification was created/sent
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }) // Timestamp of last update (e.g. marking as read)
    .defaultNow()
    .notNull(),
});

export type Notification = typeof notifications.$inferSelect; // Select/return type for notification rows
export type NewNotification = typeof notifications.$inferInsert; // Insert/create type for notification rows
