import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { SportsService } from "./sports.service";
import { sportCreateSchema, sportUpdateSchema, paginationSchema } from "@playmate/validation";
import { AuthGuard, RolesGuard } from "@/common/auth.guard";
import { UserRole } from "@playmate/types";

export class CreateSportDto extends createZodDto(sportCreateSchema) {}
export class UpdateSportDto extends createZodDto(sportUpdateSchema) {}
export class SportQueryDto extends createZodDto(
  paginationSchema.extend({
    search: z.string().optional(),
  }),
) {}

@ApiTags("Sports")
@Controller("sports")
export class SportsController {
  constructor(private readonly sportsService: SportsService) {}

  @Get()
  @ApiOperation({ summary: "List sports with pagination and search" })
  async findAll(@Query() query: SportQueryDto) {
    const params = paginationSchema.parse(query);
    const data = await this.sportsService.findAll({ ...params, search: query.search });
    return { success: true, data };
  }

  @Get("slug/:slug")
  @ApiOperation({ summary: "Get sport by URL-safe slug" })
  @ApiParam({ name: "slug", description: "Sport slug (e.g. badminton)" })
  async findBySlug(@Param("slug") slug: string) {
    const data = await this.sportsService.findBySlug(slug);
    return { success: true, data };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get sport by ID" })
  @ApiParam({ name: "id", description: "Sport UUID" })
  async findOne(@Param("id") id: string) {
    const data = await this.sportsService.findById(id);
    return { success: true, data };
  }

  @Post()
  @UseGuards(AuthGuard, new RolesGuard([UserRole.ADMIN, UserRole.VENUE_OWNER]))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new sport (ADMIN / VENUE_OWNER)" })
  async create(@Body() body: CreateSportDto) {
    const data = sportCreateSchema.parse(body);
    const sport = await this.sportsService.create(data);
    return { success: true, data: sport };
  }

  @Patch(":id")
  @UseGuards(AuthGuard, new RolesGuard([UserRole.ADMIN]))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update an existing sport (ADMIN)" })
  @ApiParam({ name: "id", description: "Sport UUID" })
  async update(@Param("id") id: string, @Body() body: UpdateSportDto) {
    const data = sportUpdateSchema.parse(body);
    const sport = await this.sportsService.update(id, data);
    return { success: true, data: sport };
  }

  @Delete(":id")
  @UseGuards(AuthGuard, new RolesGuard([UserRole.ADMIN]))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete a sport (ADMIN)" })
  @ApiParam({ name: "id", description: "Sport UUID" })
  async remove(@Param("id") id: string) {
    await this.sportsService.remove(id);
    return { success: true, message: "Sport deleted" };
  }
}

