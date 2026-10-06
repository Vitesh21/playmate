import { Inject, Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { DRIZZLE_DB, type DrizzleDb } from "@/db/database.module";
import { reviews, type NewReview } from "@/db/schema/reviews";
import { venues } from "@/db/schema/venues";
import { products } from "@/db/schema/products";
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
    if (!input.venueId && !input.productId) {
      throw new BadRequestException("Either venueId or productId is required");
    }

    return this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(reviews)
        .values({
          userId,
          rating: input.rating,
          comment: input.comment,
          venueId: input.venueId ?? null,
          productId: input.productId ?? null,
          images: input.images,
          isVerified: false,
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
            averageRating: Math.round(Number(avg) * 10) / 10,
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
