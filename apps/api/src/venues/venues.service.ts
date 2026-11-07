import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, ilike, and, gte, lte, gt, lt, count, desc, asc, inArray, or, arrayContains, sql } from "drizzle-orm";
import { DRIZZLE_DB, type DrizzleDb } from "@/db/database.module";
import { venues, type NewVenue } from "@/db/schema/venues";
import { courts } from "@/db/schema/courts";
import { courtSlots } from "@/db/schema/court-slots";
import { reviews } from "@/db/schema/reviews";
import { venueFavorites } from "@/db/schema/venue-favorites";
import type {
  VenueCreateInput,
  VenueUpdateInput,
  VenueSearchInput,
  PaginationInput,
} from "@playmate/validation";
import type { PaginatedResponse } from "@playmate/types";
import { UserRole } from "@playmate/types";

@Injectable()
export class VenuesService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async search(params: VenueSearchInput & PaginationInput): Promise<PaginatedResponse<any>> {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 10;
    const offset = (page - 1) * perPage;

    const filters: any[] = [eq(venues.isActive, true), eq(venues.verificationStatus, "APPROVED")];
    if (params.sportId) filters.push(eq(venues.sportId, params.sportId));
    if (params.city) filters.push(ilike(venues.city, `%${params.city}%`));
    if (params.amenities) {
      const requiredAmenities = params.amenities.split(",").map((item) => item.trim()).filter(Boolean);
      for (const amenity of requiredAmenities) filters.push(arrayContains(venues.amenities, [amenity]));
    }
    if (params.search) {
      filters.push(
        or(
          ilike(venues.name, `%${params.search}%`),
          ilike(venues.address, `%${params.search}%`),
          ilike(venues.description, `%${params.search}%`),
        ),
      );
    }

    const courtFilters: any[] = [eq(courts.isActive, true)];
    if (params.minPrice !== undefined) courtFilters.push(gte(courts.hourlyRate, params.minPrice));
    if (params.maxPrice !== undefined) courtFilters.push(lte(courts.hourlyRate, params.maxPrice));
    if (params.courtType) courtFilters.push(ilike(courts.type, params.courtType));
    if (params.surface) courtFilters.push(ilike(courts.surface, `%${params.surface}%`));
    if (params.minPrice !== undefined || params.maxPrice !== undefined || params.courtType || params.surface) {
      const matchingCourts = await this.db.select({ venueId: courts.venueId }).from(courts).where(and(...courtFilters));
      const venueIds = [...new Set(matchingCourts.map((court) => court.venueId))];
      if (!venueIds.length) return { items: [], total: 0, page, perPage, totalPages: 0 };
      filters.push(inArray(venues.id, venueIds));
    }

    if (params.date || params.availableNow) {
      const now = new Date();
      const localNow = new Date(now.getTime() + (params.utcOffsetMinutes ?? 0) * 60_000);
      const today = localNow.toISOString().slice(0, 10);
      const timeNow = localNow.toISOString().slice(11, 16);
      const searchDate = params.availableNow ? today : params.date!;
      const matchingSlots = await this.db.select({ venueId: courts.venueId }).from(courtSlots)
        .innerJoin(courts, eq(courts.id, courtSlots.courtId))
        .where(and(
          eq(courtSlots.date, searchDate),
          eq(courtSlots.isAvailable, true),
          params.availableNow ? lte(courtSlots.startTime, timeNow) : params.startTime || params.endTime ? lt(courtSlots.startTime, params.endTime ?? "23:59") : undefined,
          params.availableNow ? gte(courtSlots.endTime, timeNow) : params.startTime || params.endTime ? gt(courtSlots.endTime, params.startTime ?? "00:00") : undefined,
        ));
      const availableVenueIds = [...new Set(matchingSlots.map((slot) => slot.venueId))];
      if (!availableVenueIds.length) return { items: [], total: 0, page, perPage, totalPages: 0 };
      filters.push(inArray(venues.id, availableVenueIds));
    }

    if (params.minRating !== undefined) {
      const rated = await this.db.select({ venueId: reviews.venueId, average: sql<number>`avg(${reviews.rating})` })
        .from(reviews).where(and(sql`${reviews.venueId} is not null`, eq(reviews.isVerified, true)))
        .groupBy(reviews.venueId).having(gte(sql`avg(${reviews.rating})`, params.minRating));
      const ratedVenueIds = rated.map((row) => row.venueId).filter((id): id is string => id !== null);
      if (!ratedVenueIds.length) return { items: [], total: 0, page, perPage, totalPages: 0 };
      filters.push(inArray(venues.id, ratedVenueIds));
    }

    const matchingVenues: any[] = await this.db
      .select()
      .from(venues)
      .where(and(...filters))
      .orderBy(desc(venues.createdAt));

    const [totalObj] = await this.db
      .select({ value: count() })
      .from(venues)
      .where(filters.length > 0 ? and(...filters) : undefined);

    const total = Number(totalObj?.value ?? 0);
    let orderedVenues = matchingVenues;
    if (params.latitude !== undefined && params.longitude !== undefined) {
      const distance = (venue: any) => {
        if (venue.latitude == null || venue.longitude == null) return Number.POSITIVE_INFINITY;
        const radians = (degrees: number) => degrees * Math.PI / 180;
        const dLat = radians(Number(venue.latitude) - params.latitude!);
        const dLon = radians(Number(venue.longitude) - params.longitude!);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(params.latitude!)) * Math.cos(radians(Number(venue.latitude))) * Math.sin(dLon / 2) ** 2;
        return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };
      orderedVenues = orderedVenues
        .map((venue) => ({ venue, distanceKm: distance(venue) }))
        .filter(({ distanceKm }) => params.radiusKm === undefined || distanceKm <= params.radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .map(({ venue, distanceKm }) => ({ ...venue, distanceKm }));
    }
    const filteredTotal = orderedVenues.length;
    const items = orderedVenues.slice(offset, offset + perPage);
    if (items.length) {
      const venueIds = items.map((venue) => venue.id);
      const indiaNow = new Date().toLocaleString("en-GB", { timeZone: "Asia/Kolkata", hourCycle: "h23" });
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      const localTime = indiaNow.split(", ")[1]?.slice(0, 5) ?? "00:00";
      const [venueCourts, venueReviews, availableSlots] = await Promise.all([
        this.db.select({ venueId: courts.venueId, hourlyRate: courts.hourlyRate }).from(courts)
          .where(and(inArray(courts.venueId, venueIds), eq(courts.isActive, true))),
        this.db.select({ venueId: reviews.venueId, rating: reviews.rating }).from(reviews)
          .where(and(inArray(reviews.venueId, venueIds), eq(reviews.isVerified, true))),
        this.db.select({ venueId: courts.venueId, date: courtSlots.date, startTime: courtSlots.startTime, endTime: courtSlots.endTime, price: courtSlots.price })
          .from(courtSlots).innerJoin(courts, eq(courts.id, courtSlots.courtId))
          .where(and(
            inArray(courts.venueId, venueIds),
            eq(courts.isActive, true),
            eq(courtSlots.isAvailable, true),
            or(gt(courtSlots.date, today), and(eq(courtSlots.date, today), gt(courtSlots.startTime, localTime))),
          ))
          .orderBy(asc(courtSlots.date), asc(courtSlots.startTime)).limit(1000),
      ]);
      const priceFrom = new Map<string, number>();
      for (const court of venueCourts) {
        const rate = Number(court.hourlyRate);
        priceFrom.set(court.venueId, Math.min(priceFrom.get(court.venueId) ?? Number.POSITIVE_INFINITY, rate));
      }
      const ratings = new Map<string, { sum: number; count: number }>();
      for (const review of venueReviews) {
        if (!review.venueId) continue;
        const current = ratings.get(review.venueId) ?? { sum: 0, count: 0 };
        ratings.set(review.venueId, { sum: current.sum + review.rating, count: current.count + 1 });
      }
      const nextSlotByVenue = new Map<string, (typeof availableSlots)[number]>();
      for (const slot of availableSlots) {
        const existing = nextSlotByVenue.get(slot.venueId);
        if (!existing || `${slot.date} ${slot.startTime}` < `${existing.date} ${existing.startTime}`) nextSlotByVenue.set(slot.venueId, slot);
      }
      for (let index = 0; index < items.length; index += 1) {
        const venue = items[index]!;
        const rating = ratings.get(venue.id);
        const nextSlot = nextSlotByVenue.get(venue.id);
        items[index] = {
          ...venue,
          priceFrom: priceFrom.get(venue.id) ?? null,
          ratingAverage: rating ? Math.round((rating.sum / rating.count) * 10) / 10 : null,
          nextAvailableSlot: nextSlot ? { date: nextSlot.date, startTime: nextSlot.startTime, endTime: nextSlot.endTime, price: nextSlot.price } : null,
        };
      }
    }
    return { items, total: params.latitude !== undefined && params.longitude !== undefined ? filteredTotal : total, page, perPage, totalPages: Math.ceil((params.latitude !== undefined && params.longitude !== undefined ? filteredTotal : total) / perPage) };
  }

  async findById(id: string) {
    const [item] = await this.db.select().from(venues).where(and(eq(venues.id, id), eq(venues.verificationStatus, "APPROVED"))).limit(1);
    if (!item) throw new NotFoundException("Venue not found");
    return item;
  }

  async findBySlug(slug: string) {
    const [item] = await this.db.select().from(venues).where(and(eq(venues.slug, slug), eq(venues.verificationStatus, "APPROVED"))).limit(1);
    if (!item) throw new NotFoundException("Venue not found");
    return item;
  }

  async create(data: VenueCreateInput) {
    const [created] = await this.db.insert(venues).values(data as unknown as NewVenue).returning();
    return created;
  }

  async update(id: string, data: VenueUpdateInput, actorId: string, role: UserRole) {
    const [venue] = await this.db.select().from(venues).where(eq(venues.id, id)).limit(1);
    if (!venue) throw new NotFoundException("Venue not found");
    if (role !== UserRole.ADMIN && venue.ownerId !== actorId) throw new ForbiddenException("You can only update your own venues");
    const [updated] = await this.db
      .update(venues)
      .set({ ...(role === UserRole.ADMIN ? data : { ...data, ownerId: undefined } as any), updatedAt: new Date() })
      .where(eq(venues.id, id))
      .returning();
    if (!updated) throw new NotFoundException("Venue not found");
    return updated;
  }

  async remove(id: string, actorId: string, role: UserRole) {
    const [venue] = await this.db.select().from(venues).where(eq(venues.id, id)).limit(1);
    if (!venue) throw new NotFoundException("Venue not found");
    if (role !== UserRole.ADMIN && venue.ownerId !== actorId) throw new ForbiddenException("You can only delete your own venues");
    const [deleted] = await this.db.delete(venues).where(eq(venues.id, id)).returning();
    if (!deleted) throw new NotFoundException("Venue not found");
    return deleted;
  }

  async getCourts(venueId: string) {
    await this.findById(venueId);
    return this.db.select().from(courts).where(eq(courts.venueId, venueId)).orderBy(courts.name);
  }

  /** Venues owned by a specific user (VENUE_OWNER "my venues" view). */
  async findByOwner(ownerId: string) {
    return this.db
      .select()
      .from(venues)
      .where(eq(venues.ownerId, ownerId))
      .orderBy(desc(venues.createdAt));
  }

  async listFavorites(userId: string) {
    return this.db.select({ venue: venues, favoritedAt: venueFavorites.createdAt })
      .from(venueFavorites)
      .innerJoin(venues, eq(venues.id, venueFavorites.venueId))
      .where(and(eq(venueFavorites.userId, userId), eq(venues.isActive, true), eq(venues.verificationStatus, "APPROVED")))
      .orderBy(desc(venueFavorites.createdAt));
  }

  async addFavorite(userId: string, venueId: string) {
    await this.findById(venueId);
    await this.db.insert(venueFavorites).values({ userId, venueId }).onConflictDoNothing();
    return { venueId, isFavorite: true };
  }

  async removeFavorite(userId: string, venueId: string) {
    await this.db.delete(venueFavorites).where(and(eq(venueFavorites.userId, userId), eq(venueFavorites.venueId, venueId)));
    return { venueId, isFavorite: false };
  }

  async pendingVerification() {
    return this.db.select().from(venues).where(eq(venues.verificationStatus, "PENDING")).orderBy(desc(venues.createdAt));
  }

  async setVerification(id: string, status: "APPROVED" | "REJECTED") {
    const [updated] = await this.db.update(venues).set({ verificationStatus: status, updatedAt: new Date() }).where(eq(venues.id, id)).returning();
    if (!updated) throw new NotFoundException("Venue not found");
    return updated;
  }
}
