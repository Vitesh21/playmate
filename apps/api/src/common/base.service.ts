import { Inject, Injectable } from "@nestjs/common";
import { eq, and, desc, asc, count, type SQL } from "drizzle-orm";
import { DRIZZLE_DB, type DrizzleDb } from "@/db/database.module";
import type { PaginationParams, PaginatedResponse } from "@playmate/types";

@Injectable()
export abstract class BaseService<TTable extends Record<string, any>, TNew, TUpdate> {
  constructor(
    @Inject(DRIZZLE_DB) protected readonly db: DrizzleDb,
    protected readonly table: TTable,
  ) {}

  async findAll(
    params: PaginationParams = {},
    filters: SQL[] = [],
    orderBy: SQL = desc((this.table as any).createdAt),
  ): Promise<PaginatedResponse<any>> {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 10;
    const offset = (page - 1) * perPage;

    const where = filters.length > 0 ? and(...filters) : undefined;

    const [items, [totalObj]] = await Promise.all([
      this.db.select().from(this.table).where(where).orderBy(orderBy).limit(perPage).offset(offset),
      this.db.select({ value: count() }).from(this.table).where(where),
    ]);

    const total = Number(totalObj?.value ?? 0);

    return {
      items,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };
  }

  async findById(id: string) {
    const [record] = await this.db
      .select()
      .from(this.table)
      .where(eq((this.table as any).id, id))
      .limit(1);
    return record;
  }

  async create(data: TNew) {
    const [created] = await this.db.insert(this.table).values(data as any).returning();
    return created;
  }

  async update(id: string, data: TUpdate) {
    const [updated] = await this.db
      .update(this.table)
      .set({ ...(data as any), updatedAt: new Date() })
      .where(eq((this.table as any).id, id))
      .returning();
    return updated;
  }

  async remove(id: string) {
    const [deleted] = await this.db
      .delete(this.table)
      .where(eq((this.table as any).id, id))
      .returning();
    return deleted;
  }
}
