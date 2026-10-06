import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, and, sql } from "drizzle-orm";
import { DRIZZLE_DB, type DrizzleDb } from "@/db/database.module";
import { inventory, type NewInventory } from "@/db/schema/inventory";
import type { InventoryUpdateInput } from "@playmate/validation";

@Injectable()
export class InventoryService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async findByVariant(variantId: string) {
    return this.db.select().from(inventory).where(eq(inventory.variantId, variantId));
  }

  async findByVariantAndWarehouse(variantId: string, warehouse?: string) {
    const filters: any[] = [eq(inventory.variantId, variantId)];
    if (warehouse) filters.push(eq(inventory.warehouse, warehouse));
    else filters.push(eq(inventory.warehouse, null as any));
    const [item] = await this.db.select().from(inventory).where(and(...filters)).limit(1);
    return item;
  }

  async upsert(data: InventoryUpdateInput) {
    const existing = await this.findByVariantAndWarehouse(data.variantId, data.warehouse as any);
    if (existing) {
      const [updated] = await this.db
        .update(inventory)
        .set({
          quantity: data.quantity,
          reservedQuantity: data.reservedQuantity,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await this.db
      .insert(inventory)
      .values({
        variantId: data.variantId,
        quantity: data.quantity,
        reservedQuantity: data.reservedQuantity,
        warehouse: data.warehouse ?? null,
      } satisfies NewInventory)
      .returning();
    return created;
  }

  async decrement(variantId: string, quantity: number, warehouse?: string) {
    return this.db.transaction(async (tx) => {
      const filters: any[] = [eq(inventory.variantId, variantId)];
      if (warehouse) filters.push(eq(inventory.warehouse, warehouse));
      else filters.push(eq(inventory.warehouse, null as any));

      const [inv] = await tx.select().from(inventory).where(and(...filters)).limit(1).for("update");
      if (!inv) throw new NotFoundException("Inventory record not found");
      if (inv.quantity < quantity) {
        throw new Error(`Insufficient inventory. Available: ${inv.quantity}, Required: ${quantity}`);
      }

      const [updated] = await tx
        .update(inventory)
        .set({
          quantity: inv.quantity - quantity,
          reservedQuantity: inv.reservedQuantity + quantity,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, inv.id))
        .returning();
      return updated;
    });
  }

  async release(variantId: string, quantity: number, warehouse?: string) {
    const filters: any[] = [eq(inventory.variantId, variantId)];
    if (warehouse) filters.push(eq(inventory.warehouse, warehouse));
    const [updated] = await this.db
      .update(inventory)
      .set({
        quantity: sql`${inventory.quantity} + ${quantity}`,
        reservedQuantity: sql`GREATEST(0, ${inventory.reservedQuantity} - ${quantity})`,
        updatedAt: new Date(),
      })
      .where(and(...filters))
      .returning();
    return updated;
  }
}
