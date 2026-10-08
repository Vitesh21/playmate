/**
 * @file on-demand-order-items.ts
 * @description Line items (`on_demand_order_items`) belonging to a mid-session
 *              on-demand order. Contains price snapshots and qty so the
 *              original receipt is always reproducible.
 *
 * Relationships:
 * - FK: `orderId`           -> on_demand_orders.id  (ON DELETE CASCADE)
 * - FK: `venueEssentialId`  -> venue_essentials.id
 */
import {
  pgTable,
  timestamp,
  uuid,
  integer,
  text,
} from "drizzle-orm/pg-core";
import { onDemandOrders } from "./on-demand-orders";
import { venueEssentials } from "./venue-essentials";

export const onDemandOrderItems = pgTable("on_demand_order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => onDemandOrders.id, { onDelete: "cascade" }),
  venueEssentialId: uuid("venue_essential_id")
    .notNull()
    .references(() => venueEssentials.id),
  quantity: integer("quantity").notNull(),
  unitPriceSnapshot: integer("unit_price_snapshot").notNull(),
  totalPriceSnapshot: integer("total_price_snapshot").notNull(),
  nameSnapshot: text("name_snapshot").notNull(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  orderEssentialUnique: {
    unique: true,
    columns: [table.orderId, table.venueEssentialId],
  },
  quantityPositive: { check: `quantity > 0` },
  unitPriceNonNegative: { check: `unit_price_snapshot >= 0` },
  totalPriceNonNegative: { check: `total_price_snapshot >= 0` },
}));

export type OnDemandOrderItem = typeof onDemandOrderItems.$inferSelect;
export type NewOnDemandOrderItem = typeof onDemandOrderItems.$inferInsert;
