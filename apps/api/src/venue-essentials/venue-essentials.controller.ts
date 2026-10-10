import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Req,
  HttpCode,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { VenueEssentialsService } from "./venue-essentials.service";
import { AuthGuard, RolesGuard } from "@/common/auth.guard";
import { UserRole } from "@playmate/types";
import {
  venueEssentialCreateSchema,
  venueEssentialUpdateSchema,
  venueEssentialSearchSchema,
  attachEssentialsToBookingSchema,
  onDemandOrderCreateSchema,
  onDemandOrderUpdateStatusSchema,
  paginationSchema,
} from "@playmate/validation";

export class CreateVenueEssentialDto extends createZodDto(venueEssentialCreateSchema) {}
export class UpdateVenueEssentialDto extends createZodDto(venueEssentialUpdateSchema) {}
export class VenueEssentialSearchQueryDto extends createZodDto(venueEssentialSearchSchema.partial().and(paginationSchema)) {}
export class AttachEssentialsToBookingDto extends createZodDto(attachEssentialsToBookingSchema.omit({ bookingId: true })) {}
export class CreateOnDemandOrderDto extends createZodDto(onDemandOrderCreateSchema.omit({ userId: true })) {}
export class UpdateOnDemandStatusDto extends createZodDto(onDemandOrderUpdateStatusSchema) {}

@ApiTags("Venue Essentials")
@Controller("venue-essentials")
export class VenueEssentialsController {
  constructor(private readonly svc: VenueEssentialsService) {}

  // ---------- Catalog (public read) ----------

  @Get()
  @ApiOperation({ summary: "List venue essentials catalog" })
  async search(@Query() query: VenueEssentialSearchQueryDto) {
    const filters = venueEssentialSearchSchema.partial().parse(query);
    const page = paginationSchema.parse(query);
    const data = await this.svc.search({ ...filters, ...page } as any);
    return { success: true, data };
  }

  @Get("recommendations")
  @ApiOperation({ summary: "Get venue essential recommendations" })
  @ApiQuery({ name: "venueId", required: true, description: "Venue UUID" })
  @ApiQuery({ name: "sportId", required: true, description: "Sport UUID" })
  @ApiQuery({ name: "limit", required: false, description: "Max count" })
  async recommendations(
    @Query("venueId") venueId: string,
    @Query("sportId") sportId: string,
    @Query("limit") limit?: string,
  ) {
    const data = await this.svc.findRecommendations(venueId, sportId, limit ? parseInt(limit) : 6);
    return { success: true, data };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get venue essential by ID" })
  @ApiParam({ name: "id", description: "Essential UUID" })
  async findOne(@Param("id") id: string) {
    const data = await this.svc.findById(id);
    return { success: true, data };
  }

  // ---------- Catalog (write) — VENUE_OWNER or ADMIN ----------

  @Post()
  @UseGuards(AuthGuard, new RolesGuard([UserRole.VENUE_OWNER, UserRole.ADMIN]))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a venue essential (VENUE_OWNER/ADMIN)" })
  async create(@Body() body: CreateVenueEssentialDto) {
    const input = venueEssentialCreateSchema.parse(body);
    const data = await this.svc.create(input);
    return { success: true, data };
  }

  @Patch(":id")
  @UseGuards(AuthGuard, new RolesGuard([UserRole.VENUE_OWNER, UserRole.ADMIN]))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a venue essential (VENUE_OWNER/ADMIN)" })
  @ApiParam({ name: "id", description: "Essential UUID" })
  async update(@Param("id") id: string, @Body() body: UpdateVenueEssentialDto) {
    const input = venueEssentialUpdateSchema.parse(body);
    const data = await this.svc.update(id, input);
    return { success: true, data };
  }

  @Delete(":id")
  @UseGuards(AuthGuard, new RolesGuard([UserRole.VENUE_OWNER, UserRole.ADMIN]))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Archive a venue essential (VENUE_OWNER/ADMIN)" })
  @ApiParam({ name: "id", description: "Essential UUID" })
  async remove(@Param("id") id: string) {
    await this.svc.remove(id);
    return { success: true, message: "Venue essential archived" };
  }

  // ---------- Booking essentials (attach to booking) ----------

  @Get("bookings/:bookingId")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get essentials attached to a booking" })
  @ApiParam({ name: "bookingId", description: "Booking UUID" })
  async bookingEssentials(@Param("bookingId") bookingId: string) {
    const data = await this.svc.getBookingEssentials(bookingId);
    return { success: true, data };
  }

  @Post("bookings/:bookingId/attach")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: "Attach essentials to a booking" })
  @ApiParam({ name: "bookingId", description: "Booking UUID" })
  async attachToBooking(
    @Param("bookingId") bookingId: string,
    @Body() body: AttachEssentialsToBookingDto,
  ) {
    const raw = typeof body === "object" && body ? body : {};
    const input = attachEssentialsToBookingSchema.parse({ ...raw, bookingId });
    try {
      const data = await this.svc.attachEssentialsToBooking(input);
      return { success: true, data };
    } catch (err: any) {
      throw new BadRequestException(err?.message || "Failed to attach essentials");
    }
  }

  // ---------- On-demand orders ----------

  @Post("on-demand")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create an on-demand order during play" })
  async createOnDemand(@Req() req: any, @Body() body: CreateOnDemandOrderDto) {
    const userId = (req.user?.id as string) ?? ((body as any).userId);
    const raw = typeof body === "object" && body ? body : {};
    const input = onDemandOrderCreateSchema.parse({ ...raw, userId });
    try {
      const data = await this.svc.createOnDemandOrder(input);
      return { success: true, data };
    } catch (err: any) {
      throw new BadRequestException(err?.message || "Failed to create on-demand order");
    }
  }

  @Get("on-demand")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List on-demand orders for current user or venue owner" })
  async listOnDemand(@Req() req: any) {
    const userId = req.user?.id as string;
    const role = (req.user?.role as string) ?? "USER";
    const data = await this.svc.listOnDemandOrders(userId, role);
    return { success: true, data };
  }

  @Patch("on-demand/:id/status")
  @UseGuards(AuthGuard, new RolesGuard([UserRole.VENUE_OWNER, UserRole.ADMIN]))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update on-demand order status (VENUE_OWNER/ADMIN)" })
  @ApiParam({ name: "id", description: "On-demand order UUID" })
  async updateOnDemandStatus(@Param("id") id: string, @Body() body: UpdateOnDemandStatusDto) {
    const input = onDemandOrderUpdateStatusSchema.parse(body);
    const data = await this.svc.updateOnDemandStatus(id, input);
    return { success: true, data };
  }
}
