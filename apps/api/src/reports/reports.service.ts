import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import { DRIZZLE_DB, type DrizzleDb } from "@/db/database.module";
import { userReports } from "@/db/schema/users";

@Injectable()
export class ReportsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async create(reporterId: string, input: { targetType: "USER" | "GAME" | "REVIEW"; targetId: string; targetUserId?: string; reason: string }) {
    if (input.targetUserId === reporterId || (input.targetType === "USER" && input.targetId === reporterId)) {
      throw new BadRequestException("You cannot report your own account");
    }
    const [report] = await this.db.insert(userReports).values({
      reporterId,
      targetType: input.targetType,
      targetId: input.targetId,
      targetUserId: input.targetUserId ?? null,
      reason: input.reason.trim(),
    }).returning();
    return report;
  }

  async listOpen() {
    return this.db.select().from(userReports).where(eq(userReports.status, "OPEN")).orderBy(desc(userReports.createdAt));
  }

  async resolve(id: string, status: "REVIEWED" | "ACTIONED" | "DISMISSED", resolutionNote?: string) {
    const [report] = await this.db.update(userReports).set({ status, resolutionNote: resolutionNote ?? null, updatedAt: new Date() }).where(eq(userReports.id, id)).returning();
    if (!report) throw new NotFoundException("Report not found");
    return report;
  }
}
