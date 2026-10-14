import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { VenuesService } from "./venues.service";
import { AuthGuard, RolesGuard } from "@/common/auth.guard";
import { UserRole } from "@playmate/types";
import {
  venueCreateSchema,
  venueUpdateSchema,
  venueSearchSchema,
  paginationSchema,
} from "@playmate/validation";

export class CreateVenueDto extends createZodDto(venueCreateSchema) {}
export class UpdateVenueDto extends createZodDto(venueUpdateSchema) {}
export class VenueSearchQueryDto extends createZodDto(venueSearchSchema.partial().and(paginationSchema)) {}

@ApiTags("Venues")
@Controller("venues")
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get()
  @ApiOperation({ summary: "Search venues with filters and pagination" })
  async search(@Query() query: VenueSearchQueryDto) {
    const search = venueSearchSchema.partial().parse(query);
    const page = paginationSchema.parse(query);
    const data = await this.venuesService.search({ ...search, ...page });
    return { success: true, data };
  }

  @Get("mine")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List venues owned by the current user" })
  async findMine(@Req() req: any) {
    const data = await this.venuesService.findByOwner(req.user.id);
    return { success: true, data };
  }

  @Get("slug/:slug")
  @ApiOperation({ summary: "Get venue by URL-safe slug" })
  @ApiParam({ name: "slug", description: "Venue slug" })
  async findBySlug(@Param("slug") slug: string) {
    const data = await this.venuesService.findBySlug(slug);
    return { success: true, data };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get venue by ID" })
  @ApiParam({ name: "id", description: "Venue UUID" })
  async findOne(@Param("id") id: string) {
    const data = await this.venuesService.findById(id);
    return { success: true, data };
  }

  @Get(":id/courts")
  @ApiOperation({ summary: "List courts belonging to a venue" })
  @ApiParam({ name: "id", description: "Venue UUID" })
  async getCourts(@Param("id") id: string) {
    const data = await this.venuesService.getCourts(id);
    return { success: true, data };
  }

  @Post()
  @UseGuards(AuthGuard, new RolesGuard([UserRole.VENUE_OWNER, UserRole.ADMIN]))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new venue (VENUE_OWNER / ADMIN)" })
  async create(@Req() req: any, @Body() body: CreateVenueDto) {
    const data = venueCreateSchema.parse(body);
    // VENUE_OWNERs always own what they create; ADMINs may assign an owner.
    const ownerId =
      req.user?.role === UserRole.ADMIN ? data.ownerId ?? req.user.id : req.user.id;
    const venue = await this.venuesService.create({ ...data, ownerId } as any);
    return { success: true, data: venue };
  }

  @Patch(":id")
  @UseGuards(AuthGuard, new RolesGuard([UserRole.VENUE_OWNER, UserRole.ADMIN]))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update venue details (VENUE_OWNER / ADMIN)" })
  @ApiParam({ name: "id", description: "Venue UUID" })
  async update(@Param("id") id: string, @Body() body: UpdateVenueDto) {
    const data = venueUpdateSchema.parse(body);
    const venue = await this.venuesService.update(id, data);
    return { success: true, data: venue };
  }

  @Delete(":id")
  @UseGuards(AuthGuard, new RolesGuard([UserRole.VENUE_OWNER, UserRole.ADMIN]))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete a venue (VENUE_OWNER / ADMIN)" })
  @ApiParam({ name: "id", description: "Venue UUID" })
  async remove(@Param("id") id: string) {
    await this.venuesService.remove(id);
    return { success: true, message: "Venue deleted" };
  }
}

