import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, ilike, and, gte, lte, count, desc, inArray, or } from "drizzle-orm";
import { DRIZZLE_DB, type DrizzleDb } from "@/db/database.module";
import { venues, type NewVenue } from "@/db/schema/venues";
import { courts } from "@/db/schema/courts";
import { courtSlots } from "@/db/schema/court-slots";
import type {
  VenueCreateInput,
  VenueUpdateInput,
  VenueSearchInput,
  PaginationInput,
} from "@playmate/validation";
import type { PaginatedResponse } from "@playmate/types";

@Injectable()
export class VenuesService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async search(params: VenueSearchInput & PaginationInput): Promise<PaginatedResponse<any>> {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 10;
    const offset = (page - 1) * perPage;

    const filters: any[] = [eq(venues.isActive, true)];
    if (params.sportId) filters.push(eq(venues.sportId, params.sportId));
    if (params.city) filters.push(ilike(venues.city, `%${params.city}%`));
    if (params.search) {
      filters.push(
        or(
          ilike(venues.name, `%${params.search}%`),
          ilike(venues.address, `%${params.search}%`),
          ilike(venues.description, `%${params.search}%`),
        ),
      );
    }

    let query = this.db
      .select()
      .from(venues)
      .where(and(...filters))
      .orderBy(desc(venues.createdAt))
      .limit(perPage)
      .offset(offset);

    const items: any[] = await query;

    if (params.date && (params.startTime || params.endTime)) {
      const venueIds = items.map((v) => v.id);
      if (venueIds.length > 0) {
        const slotFilters = [
          inArray(courtSlots.venueId, venueIds),
          eq(courtSlots.isAvailable, true),
        ];
        if (params.date) slotFilters.push(eq(courtSlots.date, params.date));
        if (params.startTime) slotFilters.push(gte(courtSlots.startTime, params.startTime));
        if (params.endTime) slotFilters.push(lte(courtSlots.endTime, params.endTime));
      }
    }

    const [[totalObj]] = await this.db
      .select({ value: count() })
      .from(venues)
      .where(and(...filters));

    const total = Number(totalObj?.value ?? 0);
    return { items, total, page, perPage, totalPages: Math.ceil(total / perPage) };
  }

  async findById(id: string) {
    const [item] = await this.db.select().from(venues).where(eq(venues.id, id)).limit(1);
    if (!item) throw new NotFoundException("Venue not found");
    return item;
  }

  async findBySlug(slug: string) {
    const [item] = await this.db.select().from(venues).where(eq(venues.slug, slug)).limit(1);
    if (!item) throw new NotFoundException("Venue not found");
    return item;
  }

  async create(data: VenueCreateInput) {
    const [created] = await this.db.insert(venues).values(data as unknown as NewVenue).returning();
    return created;
  }

  async update(id: string, data: VenueUpdateInput) {
    const [updated] = await this.db
      .update(venues)
      .set({ ...(data as unknown as Partial<NewVenue>), updatedAt: new Date() })
      .where(eq(venues.id, id))
      .returning();
    if (!updated) throw new NotFoundException("Venue not found");
    return updated;
  }

  async remove(id: string) {
    const [deleted] = await this.db.delete(venues).where(eq(venues.id, id)).returning();
    if (!deleted) throw new NotFoundException("Venue not found");
    return deleted;
  }

  async getCourts(venueId: string) {
    await this.findById(venueId);
    return this.db.select().from(courts).where(eq(courts.venueId, venueId)).orderBy(courts.name);
  }
}
