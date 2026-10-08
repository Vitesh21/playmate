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
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
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
  orderEssentialUnique: uniqueIndex("order_essential_unique").on(
    table.orderId,
    table.venueEssentialId,
  ),
  quantityPositive: check("order_item_qty_positive", sql`quantity > 0`),
  unitPriceNonNegative: check("order_item_unit_price", sql`unit_price_snapshot >= 0`),
  totalPriceNonNegative: check("order_item_total_price", sql`total_price_snapshot >= 0`),
}));

export type OnDemandOrderItem = typeof onDemandOrderItems.$inferSelect;
export type NewOnDemandOrderItem = typeof onDemandOrderItems.$inferInsert;
