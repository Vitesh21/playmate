import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, and, inArray, gt } from "drizzle-orm";
import { DRIZZLE_DB, type DrizzleDb } from "@/db/database.module";
import { courts, type NewCourt } from "@/db/schema/courts";
import { courtSlots, type NewCourtSlot } from "@/db/schema/court-slots";
import { bookings } from "@/db/schema/bookings";
import { venues } from "@/db/schema/venues";
import { UserRole } from "@playmate/types";
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

  private async assertVenueAccess(venueId: string, actorId: string, role: UserRole) {
    const [venue] = await this.db.select({ ownerId: venues.ownerId }).from(venues).where(eq(venues.id, venueId)).limit(1);
    if (!venue) throw new NotFoundException("Venue not found");
    if (role !== UserRole.ADMIN && venue.ownerId !== actorId) throw new ForbiddenException("You can only manage courts at your own venues");
  }

  async create(data: CourtCreateInput, actorId: string, role: UserRole) {
    await this.assertVenueAccess(data.venueId, actorId, role);
    const [created] = await this.db.insert(courts).values(data as unknown as NewCourt).returning();
    return created;
  }

  async update(id: string, data: CourtUpdateInput, actorId: string, role: UserRole) {
    const existing = await this.findById(id);
    await this.assertVenueAccess(existing.venueId, actorId, role);
    if (role !== UserRole.ADMIN && data.venueId && data.venueId !== existing.venueId) {
      throw new ForbiddenException("A court cannot be moved to another venue");
    }
    const [updated] = await this.db
      .update(courts)
      .set({ ...(role === UserRole.ADMIN ? data : { ...data, venueId: undefined } as any), updatedAt: new Date() })
      .where(eq(courts.id, id))
      .returning();
    if (!updated) throw new NotFoundException("Court not found");
    return updated;
  }

  async remove(id: string, actorId: string, role: UserRole) {
    const existing = await this.findById(id);
    await this.assertVenueAccess(existing.venueId, actorId, role);
    const [deleted] = await this.db.delete(courts).where(eq(courts.id, id)).returning();
    if (!deleted) throw new NotFoundException("Court not found");
    return deleted;
  }

  async getSlots(courtId: string, date?: string) {
    await this.findById(courtId);
    const filters: any[] = [eq(courtSlots.courtId, courtId)];
    if (date) filters.push(eq(courtSlots.date, date));
    const slots = await this.db
      .select()
      .from(courtSlots)
      .where(and(...filters))
      .orderBy(courtSlots.date, courtSlots.startTime);

    if (slots.length === 0) {
      return slots;
    }

    const heldSlots = await this.db
      .select({ courtSlotId: bookings.courtSlotId })
      .from(bookings)
      .where(
        and(
          inArray(
            bookings.courtSlotId,
            slots.map((slot) => slot.id),
          ),
          eq(bookings.status, "PENDING"),
          gt(bookings.expiresAt, new Date()),
        ),
      );

    const heldSlotIds = new Set(heldSlots.map((row) => row.courtSlotId));
    return slots.map((slot) => {
      const isHeld = heldSlotIds.has(slot.id);
      return {
        ...slot,
        isAvailable: slot.isAvailable && !isHeld,
        isHeld,
      };
    });
  }

  async createSlot(data: CourtSlotCreateInput, actorId: string, role: UserRole) {
    const court = await this.findById(data.courtId);
    await this.assertVenueAccess(court.venueId, actorId, role);
    const [created] = await this.db
      .insert(courtSlots)
      .values(data as unknown as NewCourtSlot)
      .returning();
    return created;
  }

  async bulkCreateSlots(courtId: string, slots: CourtSlotCreateInput[], actorId: string, role: UserRole) {
    const court = await this.findById(courtId);
    await this.assertVenueAccess(court.venueId, actorId, role);
    const values = slots.map((s) => ({ ...s, courtId } as unknown as NewCourtSlot));
    return this.db.insert(courtSlots).values(values).onConflictDoNothing().returning();
  }

  async setSlotAvailability(courtId: string, slotId: string, isAvailable: boolean, actorId: string, role: UserRole) {
    const court = await this.findById(courtId);
    await this.assertVenueAccess(court.venueId, actorId, role);
    return this.db.transaction(async (tx) => {
      const [slot] = await tx.select().from(courtSlots)
        .where(and(eq(courtSlots.id, slotId), eq(courtSlots.courtId, courtId))).for("update").limit(1);
      if (!slot) throw new NotFoundException("Slot not found for this court");

      if (!isAvailable) {
        const [activeBooking] = await tx.select({ id: bookings.id }).from(bookings)
          .where(and(eq(bookings.courtSlotId, slotId), inArray(bookings.status, ["PENDING", "CONFIRMED"]))).limit(1);
        if (activeBooking) throw new ConflictException("This slot has an active booking or payment hold and cannot be blocked");
      }

      const [updated] = await tx.update(courtSlots).set({ isAvailable, updatedAt: new Date() })
        .where(and(eq(courtSlots.id, slotId), eq(courtSlots.courtId, courtId))).returning();
      return updated;
    });
  }
}
