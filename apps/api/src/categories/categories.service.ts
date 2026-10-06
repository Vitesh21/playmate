import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, and, isNull, asc, sql, count } from "drizzle-orm";
import { DRIZZLE_DB, type DrizzleDb } from "@/db/database.module";
import { categories, type NewCategory } from "@/db/schema/categories";
import type {
  CategoryCreateInput,
  CategoryUpdateInput,
  PaginationInput,
} from "@playmate/validation";
import type { PaginatedResponse } from "@playmate/types";

@Injectable()
export class CategoriesService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async findAll(params: PaginationInput): Promise<PaginatedResponse<any>> {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 50;
    const offset = (page - 1) * perPage;

    const [items, [totalObj]] = await Promise.all([
      this.db
        .select()
        .from(categories)
        .where(eq(categories.isActive, true))
        .orderBy(asc(categories.sortOrder), asc(categories.name))
        .limit(perPage)
        .offset(offset),
      this.db.select({ value: count() }).from(categories).where(eq(categories.isActive, true)),
    ]);
    const total = Number(totalObj?.value ?? 0);
    return { items, total, page, perPage, totalPages: Math.ceil(total / perPage) };
  }

  async findTree() {
    return this.db
      .select()
      .from(categories)
      .where(and(eq(categories.isActive, true), isNull(categories.parentId)))
      .orderBy(asc(categories.sortOrder));
  }

  async findById(id: string) {
    const [item] = await this.db.select().from(categories).where(eq(categories.id, id)).limit(1);
    if (!item) throw new NotFoundException("Category not found");
    return item;
  }

  async findBySlug(slug: string) {
    const [item] = await this.db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
    if (!item) throw new NotFoundException("Category not found");
    return item;
  }

  async create(data: CategoryCreateInput) {
    const [created] = await this.db
      .insert(categories)
      .values(data as unknown as NewCategory)
      .returning();
    return created;
  }

  async update(id: string, data: CategoryUpdateInput) {
    const [updated] = await this.db
      .update(categories)
      .set({ ...(data as unknown as Partial<NewCategory>), updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    if (!updated) throw new NotFoundException("Category not found");
    return updated;
  }

  async remove(id: string) {
    const [deleted] = await this.db.delete(categories).where(eq(categories.id, id)).returning();
    if (!deleted) throw new NotFoundException("Category not found");
    return deleted;
  }
}
