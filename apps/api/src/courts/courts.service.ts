import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { DRIZZLE_DB, type DrizzleDb } from "@/db/database.module";
import { courts, type NewCourt } from "@/db/schema/courts";
import { courtSlots, type NewCourtSlot } from "@/db/schema/court-slots";
import type {
  CourtCreateInput,
  CourtUpdateInput,
  CourtSlotCreateInput,
} from "@playmate/validation";

@Injectable()
export class CourtsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async findByVenue(venueId: string) {
    return this.db.select().from(courts).where(eq(courts.venueId, venueId)).orderBy(courts.name);
  }

  async findById(id: string) {
    const [item] = await this.db.select().from(courts).where(eq(courts.id, id)).limit(1);
    if (!item) throw new NotFoundException("Court not found");
    return item;
  }

  async create(data: CourtCreateInput) {
    const [created] = await this.db.insert(courts).values(data as unknown as NewCourt).returning();
    return created;
  }

  async update(id: string, data: CourtUpdateInput) {
    const [updated] = await this.db
      .update(courts)
      .set({ ...(data as unknown as Partial<NewCourt>), updatedAt: new Date() })
      .where(eq(courts.id, id))
      .returning();
    if (!updated) throw new NotFoundException("Court not found");
    return updated;
  }

  async remove(id: string) {
    const [deleted] = await this.db.delete(courts).where(eq(courts.id, id)).returning();
    if (!deleted) throw new NotFoundException("Court not found");
    return deleted;
  }

  async getSlots(courtId: string, date?: string) {
    await this.findById(courtId);
    const filters: any[] = [eq(courtSlots.courtId, courtId)];
    if (date) filters.push(eq(courtSlots.date, date));
    return this.db
      .select()
      .from(courtSlots)
      .where(and(...filters))
      .orderBy(courtSlots.date, courtSlots.startTime);
  }

  async createSlot(data: CourtSlotCreateInput) {
    const [created] = await this.db
      .insert(courtSlots)
      .values(data as unknown as NewCourtSlot)
      .returning();
    return created;
  }

  async bulkCreateSlots(courtId: string, slots: CourtSlotCreateInput[]) {
    const values = slots.map((s) => ({ ...s, courtId } as unknown as NewCourtSlot));
    return this.db.insert(courtSlots).values(values).onConflictDoNothing().returning();
  }
}
