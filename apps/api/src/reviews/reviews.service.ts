import { Inject, Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { eq, and, desc, count, sql, lte } from "drizzle-orm";
import { DRIZZLE_DB, type DrizzleDb } from "@/db/database.module";
import { reviews, type NewReview } from "@/db/schema/reviews";
import { venues } from "@/db/schema/venues";
import { products } from "@/db/schema/products";
import { bookings } from "@/db/schema/bookings";
import { courtSlots } from "@/db/schema/court-slots";
import { courts } from "@/db/schema/courts";
import type { ReviewCreateInput, PaginationInput } from "@playmate/validation";
import type { PaginatedResponse } from "@playmate/types";

@Injectable()
export class ReviewsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async findByVenue(venueId: string, params: PaginationInput): Promise<PaginatedResponse<any>> {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 10;
    const offset = (page - 1) * perPage;

    const [items, [totalObj]] = await Promise.all([
      this.db
        .select()
        .from(reviews)
        .where(eq(reviews.venueId, venueId))
        .orderBy(desc(reviews.createdAt))
        .limit(perPage)
        .offset(offset),
      this.db.select({ value: count() }).from(reviews).where(eq(reviews.venueId, venueId)),
    ]);
    const total = Number(totalObj?.value ?? 0);
    return { items, total, page, perPage, totalPages: Math.ceil(total / perPage) };
  }

  async findByProduct(productId: string, params: PaginationInput): Promise<PaginatedResponse<any>> {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 10;
    const offset = (page - 1) * perPage;

    const [items, [totalObj]] = await Promise.all([
      this.db
        .select()
        .from(reviews)
        .where(eq(reviews.productId, productId))
        .orderBy(desc(reviews.createdAt))
        .limit(perPage)
        .offset(offset),
      this.db.select({ value: count() }).from(reviews).where(eq(reviews.productId, productId)),
    ]);
    const total = Number(totalObj?.value ?? 0);
    return { items, total, page, perPage, totalPages: Math.ceil(total / perPage) };
  }

  async findById(id: string) {
    const [item] = await this.db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
    if (!item) throw new NotFoundException("Review not found");
    return item;
  }

  async create(userId: string, input: ReviewCreateInput) {
    if (!!input.venueId === !!input.productId) {
      throw new BadRequestException("Choose exactly one venue or product to review");
    }

    return this.db.transaction(async (tx) => {
      let verifiedVenueReview = false;
      if (input.venueId) {
        const now = new Date();
        // Venue operations currently use India local time; only allow reviews
        // after the booked slot has actually ended.
        const today = new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
        const pastBookings = await tx.select({ date: courtSlots.date, endTime: courtSlots.endTime })
          .from(bookings)
          .innerJoin(courtSlots, eq(courtSlots.id, bookings.courtSlotId))
          .innerJoin(courts, eq(courts.id, courtSlots.courtId))
          .where(and(
            eq(bookings.userId, userId),
            eq(bookings.status, "CONFIRMED"),
            eq(courts.venueId, input.venueId),
            lte(courtSlots.date, today),
          ))
          .limit(100);
        const hasCompletedBooking = pastBookings.some(({ date, endTime }) =>
          new Date(`${date}T${endTime}:00+05:30`).getTime() <= now.getTime(),
        );
        if (!hasCompletedBooking) {
          throw new BadRequestException("You can review this venue after a completed, paid booking there.");
        }
        verifiedVenueReview = true;
      }

      const [created] = await tx
        .insert(reviews)
        .values({
          userId,
          rating: input.rating,
          comment: input.comment,
          venueId: input.venueId ?? null,
          productId: input.productId ?? null,
          images: input.images,
          isVerified: verifiedVenueReview,
        } satisfies NewReview)
        .returning();

      if (input.productId) {
        const stats = await tx
          .select({
            avg: sql<number>`avg(${reviews.rating})`.as("avg"),
            cnt: sql<number>`count(*)`.as("cnt"),
          })
          .from(reviews)
          .where(eq(reviews.productId, input.productId));

        const avg = stats[0]?.avg ?? input.rating;
        const cnt = stats[0]?.cnt ?? 1;
        await tx
          .update(products)
          .set({
            averageRating: String(Math.round(Number(avg) * 10) / 10),
            reviewCount: Number(cnt),
          })
          .where(eq(products.id, input.productId));
      }

      return created;
    });
  }

  async remove(userId: string, id: string) {
    const review = await this.findById(id);
    if (review.userId !== userId) {
      throw new BadRequestException("You can only delete your own reviews");
    }
    const [deleted] = await this.db.delete(reviews).where(eq(reviews.id, id)).returning();
    return deleted;
  }
}
