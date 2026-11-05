import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { AuthGuard, RolesGuard } from "@/common/auth.guard";
import { UserRole } from "@playmate/types";
import { ReportsService } from "./reports.service";

const createReportSchema = z.object({
  targetType: z.enum(["USER", "GAME", "REVIEW"]),
  targetId: z.string().uuid(),
  targetUserId: z.string().uuid().optional(),
  reason: z.string().trim().min(5).max(1000),
});
class CreateReportDto extends createZodDto(createReportSchema) {}

@ApiTags("Reports")
@Controller("reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Report a user or community content" })
  async create(@Req() req: any, @Body() body: CreateReportDto) {
    return { success: true, data: await this.reports.create(req.user.id, createReportSchema.parse(body)) };
  }

  @Get("admin/open")
  @UseGuards(AuthGuard, new RolesGuard([UserRole.ADMIN]))
  @ApiBearerAuth()
  async listOpen() {
    return { success: true, data: await this.reports.listOpen() };
  }

  @Patch("admin/:id")
  @UseGuards(AuthGuard, new RolesGuard([UserRole.ADMIN]))
  @ApiBearerAuth()
  async resolve(@Param("id") id: string, @Body() body: { status: "REVIEWED" | "ACTIONED" | "DISMISSED"; resolutionNote?: string }) {
    if (!["REVIEWED", "ACTIONED", "DISMISSED"].includes(body.status)) throw new BadRequestException("Invalid report resolution status");
    return { success: true, data: await this.reports.resolve(id, body.status, body.resolutionNote) };
  }
}
