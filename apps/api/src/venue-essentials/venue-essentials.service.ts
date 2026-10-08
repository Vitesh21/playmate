import { Inject, Injectable } from "@nestjs/common";
import { DRIZZLE_DB, type DrizzleDb } from "@/db/database.module";
import * as schema from "@/db/schema";
import { and, asc, desc, eq, inArray, sql, gt, isNull, type SQL } from "drizzle-orm";
import type {
  VenueEssentialCreateInput,
  VenueEssentialUpdateInput,
  VenueEssentialSearchInput,
  AttachEssentialsToBookingInput,
  OnDemandOrderCreateInput,
  OnDemandOrderStatusInput,
} from "@playmate/validation";

@Injectable()
export class VenueEssentialsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async search(filters: VenueEssentialSearchInput & { page?: number; limit?: number }) {
    const { venueId, sportId, type, isActive = true, page = 1, limit = 20 } = filters;
    const where: SQL[] = [];
    if (venueId) where.push(eq(schema.venueEssentials.venueId, venueId));
    if (sportId) where.push(eq(schema.venueEssentials.sportId, sportId));
    if (type) where.push(eq(schema.venueEssentials.type, type as any));
    if (isActive !== undefined) where.push(eq(schema.venueEssentials.isActive, isActive));

    return this.db
      .select()
      .from(schema.venueEssentials)
      .where(where.length ? and(...where) : undefined)
      .orderBy(asc(schema.venueEssentials.name))
      .limit(limit)
      .offset((page - 1) * limit);
  }

  async findById(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.venueEssentials)
      .where(eq(schema.venueEssentials.id, id));
    return row;
  }

  async findRecommendations(venueId: string, sportId: string, limit = 6) {
    const rows = await this.db
      .select()
      .from(schema.venueEssentials)
      .where(and(
        eq(schema.venueEssentials.venueId, venueId),
        eq(schema.venueEssentials.sportId, sportId),
        eq(schema.venueEssentials.isActive, true),
        gt(schema.venueEssentials.stockQuantity, 0),
      ))
      .orderBy(
        desc(
          sql`CASE
            WHEN ('Most booked' = ANY(${schema.venueEssentials.tags})) THEN 3
            WHEN ('Beginners pick' = ANY(${schema.venueEssentials.tags})) THEN 2
            WHEN ('Stock low' = ANY(${schema.venueEssentials.tags})) THEN 1
            ELSE 0 END`,
        ),
        asc(schema.venueEssentials.price),
      )
      .limit(limit);
    return rows.map((row) => {
      const tags = (row.tags ?? []) as string[];
      let highlight: string | null = null;
      if (tags.includes("Most booked")) highlight = "Most booked";
      else if (tags.includes("Beginners pick")) highlight = "Beginners' pick";
      else if (tags.includes("Stock low")) highlight = "Stock low";
      return { ...row, recommendation: highlight };
    });
  }

  async create(input: VenueEssentialCreateInput) {
    const [row] = await this.db.insert(schema.venueEssentials).values(input).returning();
    return row;
  }

  async update(id: string, input: VenueEssentialUpdateInput) {
    const [row] = await this.db
      .update(schema.venueEssentials)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(schema.venueEssentials.id, id))
      .returning();
    return row;
  }

  async remove(id: string) {
    await this.db
      .update(schema.venueEssentials)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.venueEssentials.id, id));
  }

  async getBookingEssentials(bookingId: string) {
    return this.db
      .select()
      .from(schema.bookingEssentials)
      .where(eq(schema.bookingEssentials.bookingId, bookingId))
      .orderBy(asc(schema.bookingEssentials.createdAt));
  }

  async attachEssentialsToBooking(input: AttachEssentialsToBookingInput & { bookingId?: string }) {
    const bookingId = input.bookingId;
    if (!bookingId) throw new Error("bookingId is required");
    const items = input.items;
    return this.db.transaction(async (tx) => {
      const essentialIds = items.map((i: any) => i.venueEssentialId ?? i.essentialId);
      const rows = await tx
        .select()
        .from(schema.venueEssentials)
        .where(inArray(schema.venueEssentials.id, essentialIds));
      const byId = new Map(rows.map((r) => [r.id, r]));

      const lines = items.map((it: any) => {
        const id = it.venueEssentialId ?? it.essentialId;
        const e = byId.get(id);
        if (!e) throw new Error(`Essential ${id} not found`);
        if (it.quantity > e.maxPerBooking)
          throw new Error(
            `Quantity ${it.quantity} > maxPerBooking ${e.maxPerBooking} for ${e.name}`,
          );
        if (it.quantity > e.stockQuantity)
          throw new Error(`Insufficient stock for ${e.name}`);

        const durationHours =
          e.pricingModel === "PER_HOUR" ? (it.durationHours ?? 1) : undefined;
        const qty = it.quantity;
        const unit = e.price;
        let lineTotal: number;
        switch (e.pricingModel) {
          case "PER_HOUR":
            lineTotal = unit * (durationHours ?? 1) * qty;
            break;
          case "PER_BOOKING":
            lineTotal = unit * qty;
            break;
          case "FIXED":
          default:
            lineTotal = unit * qty;
        }

        return {
          bookingId,
          venueEssentialId: e.id,
          quantity: qty,
          durationHours,
          unitPriceSnapshot: unit,
          lineTotal,
          nameSnapshot: e.name,
          typeSnapshot: e.type,
          pricingModelSnapshot: e.pricingModel,
          fulfillmentStatus: "PENDING" as const,
          notes: it.notes ?? null,
        };
      });

      for (const it of items) {
        const id = (it as any).venueEssentialId ?? (it as any).essentialId;
        await tx
          .update(schema.venueEssentials)
          .set({
            stockQuantity: sql`${schema.venueEssentials.stockQuantity} - ${it.quantity}`,
          })
          .where(eq(schema.venueEssentials.id, id));
      }

      const inserted = await tx
        .insert(schema.bookingEssentials)
        .values(lines as any)
        .onConflictDoNothing()
        .returning();

      return inserted;
    });
  }

  async createOnDemandOrder(input: OnDemandOrderCreateInput) {
    return this.db.transaction(async (tx) => {
      const essentialIds = input.items.map((i: any) => i.venueEssentialId ?? i.essentialId);
      const rows = await tx
        .select()
        .from(schema.venueEssentials)
        .where(inArray(schema.venueEssentials.id, essentialIds));
      const byId = new Map(rows.map((r) => [r.id, r]));

      const itemLines = input.items.map((it: any) => {
        const id = it.venueEssentialId ?? it.essentialId;
        const e = byId.get(id);
        if (!e) throw new Error(`Essential ${id} not found`);
        if (it.quantity > e.stockQuantity)
          throw new Error(`Insufficient stock for ${e.name}`);
        return {
          venueEssentialId: e.id,
          quantity: it.quantity,
          nameSnapshot: e.name,
          unitPriceSnapshot: e.price,
          totalPriceSnapshot: e.price * it.quantity,
        };
      });

      const totalAmount = itemLines.reduce((s, l) => s + l.totalPriceSnapshot, 0);

      const [order] = await tx
        .insert(schema.onDemandOrders)
        .values({
          userId: input.userId!,
          bookingId: input.bookingId ?? null,
          status: "PENDING",
          totalAmount,
          deliveryNote: input.deliveryNote ?? null,
          courtNumber: input.courtNumber ?? null,
        })
        .returning();

      if (!order) {
        throw new Error("Failed to create on-demand order");
      }

      const withOrderId = itemLines.map((l) => ({
        orderId: order.id,
        venueEssentialId: l.venueEssentialId,
        quantity: l.quantity,
        unitPriceSnapshot: l.unitPriceSnapshot,
        totalPriceSnapshot: l.totalPriceSnapshot,
        nameSnapshot: l.nameSnapshot,
      }));

      for (const l of itemLines) {
        await tx
          .update(schema.venueEssentials)
          .set({
            stockQuantity: sql`${schema.venueEssentials.stockQuantity} - ${l.quantity}`,
          })
          .where(eq(schema.venueEssentials.id, l.venueEssentialId));
      }

      await tx.insert(schema.onDemandOrderItems).values(withOrderId as any);

      return { ...order, items: withOrderId };
    });
  }

  async listOnDemandOrders(userId: string, role: string) {
    if (role === "ADMIN") {
      return this.db
        .select()
        .from(schema.onDemandOrders)
        .orderBy(desc(schema.onDemandOrders.createdAt));
    }
    return this.db
      .select()
      .from(schema.onDemandOrders)
      .where(eq(schema.onDemandOrders.userId, userId))
      .orderBy(desc(schema.onDemandOrders.createdAt));
  }

  async updateOnDemandStatus(id: string, input: OnDemandOrderStatusInput) {
    const [row] = await this.db
      .update(schema.onDemandOrders)
      .set({ status: input.status as any, updatedAt: new Date() })
      .where(eq(schema.onDemandOrders.id, id))
      .returning();
    return row;
  }
}
