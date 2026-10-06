import { Inject, Injectable } from "@nestjs/common";
import { eq, and, desc, count, isNull } from "drizzle-orm";
import { DRIZZLE_DB, type DrizzleDb } from "@/db/database.module";
import { notifications, type NewNotification } from "@/db/schema/notifications";
import type { NotificationType, PaginatedResponse } from "@playmate/types";
import type { PaginationInput } from "@playmate/validation";

@Injectable()
export class NotificationsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async findByUser(userId: string, params: PaginationInput): Promise<PaginatedResponse<any>> {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 20;
    const offset = (page - 1) * perPage;

    const [items, [totalObj]] = await Promise.all([
      this.db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(perPage)
        .offset(offset),
      this.db.select({ value: count() }).from(notifications).where(eq(notifications.userId, userId)),
    ]);
    const total = Number(totalObj?.value ?? 0);
    return { items, total, page, perPage, totalPages: Math.ceil(total / perPage) };
  }

  async unreadCount(userId: string) {
    const [[result]] = await this.db
      .select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
    return Number(result?.value ?? 0);
  }

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, unknown>,
  ) {
    const [created] = await this.db
      .insert(notifications)
      .values({
        userId,
        type,
        title,
        message,
        data: data ?? null,
      } satisfies NewNotification)
      .returning();
    return created;
  }

  async markAsRead(userId: string, id: string) {
    const [updated] = await this.db
      .update(notifications)
      .set({ readAt: new Date(), updatedAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
    return updated;
  }

  async markAllAsRead(userId: string) {
    await this.db
      .update(notifications)
      .set({ readAt: new Date(), updatedAt: new Date() })
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
    return true;
  }
}
