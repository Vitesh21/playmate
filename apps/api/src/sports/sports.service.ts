import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, ilike, and, count } from "drizzle-orm";
import { DRIZZLE_DB, type DrizzleDb } from "@/db/database.module";
import { sports, type NewSport } from "@/db/schema/sports";
import type { SportCreateInput, SportUpdateInput, PaginationInput } from "@playmate/validation";
import type { PaginatedResponse } from "@playmate/types";

@Injectable()
export class SportsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async findAll(params: PaginationInput & { search?: string }): Promise<PaginatedResponse<any>> {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 10;
    const offset = (page - 1) * perPage;
    const filters: any[] = [eq(sports.isActive, true)];
    if (params.search) filters.push(ilike(sports.name, `%${params.search}%`));

    const [items, [totalObj]] = await Promise.all([
      this.db.select().from(sports).where(and(...filters)).orderBy(sports.name).limit(perPage).offset(offset),
      this.db.select({ value: count() }).from(sports).where(and(...filters)),
    ]);
    const total = Number(totalObj?.value ?? 0);
    return { items, total, page, perPage, totalPages: Math.ceil(total / perPage) };
  }

  async findById(id: string) {
    const [item] = await this.db.select().from(sports).where(eq(sports.id, id)).limit(1);
    if (!item) throw new NotFoundException("Sport not found");
    return item;
  }

  async findBySlug(slug: string) {
    const [item] = await this.db.select().from(sports).where(eq(sports.slug, slug)).limit(1);
    if (!item) throw new NotFoundException("Sport not found");
    return item;
  }

  async create(data: SportCreateInput) {
    const [created] = await this.db.insert(sports).values(data as unknown as NewSport).returning();
    return created;
  }

  async update(id: string, data: SportUpdateInput) {
    const [updated] = await this.db
      .update(sports)
      .set({ ...(data as unknown as Partial<NewSport>), updatedAt: new Date() })
      .where(eq(sports.id, id))
      .returning();
    if (!updated) throw new NotFoundException("Sport not found");
    return updated;
  }

  async remove(id: string) {
    const [deleted] = await this.db.delete(sports).where(eq(sports.id, id)).returning();
    if (!deleted) throw new NotFoundException("Sport not found");
    return deleted;
  }
}
