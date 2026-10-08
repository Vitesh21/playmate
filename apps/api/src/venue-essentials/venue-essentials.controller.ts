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
} from "@nestjs/common";
import { VenueEssentialsService } from "./venue-essentials.service";
import { AuthGuard, RolesGuard } from "@/common/auth.guard";
import {
  venueEssentialCreateSchema,
  venueEssentialUpdateSchema,
  venueEssentialSearchSchema,
  attachEssentialsToBookingSchema,
  onDemandOrderCreateSchema,
  onDemandOrderUpdateStatusSchema,
  paginationSchema,
} from "@playmate/validation";

@Controller("venue-essentials")
export class VenueEssentialsController {
  constructor(private readonly svc: VenueEssentialsService) {}

  // ---------- Catalog (public read) ----------

  @Get()
  async search(@Query() query: Record<string, any>) {
    const filters = venueEssentialSearchSchema.partial().parse(query);
    const page = paginationSchema.parse(query);
    const data = await this.svc.search({ ...filters, ...page });
    return { success: true, data };
  }

  @Get("recommendations")
  async recommendations(
    @Query("venueId") venueId: string,
    @Query("sportId") sportId: string,
    @Query("limit") limit?: string,
  ) {
    const data = await this.svc.findRecommendations(venueId, sportId, limit ? parseInt(limit) : 6);
    return { success: true, data };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const data = await this.svc.findById(id);
    return { success: true, data };
  }

  // ---------- Catalog (write) — VENUE_OWNER or ADMIN ----------

  @Post()
  @UseGuards(AuthGuard, new RolesGuard(["VENUE_OWNER", "ADMIN"]))
  async create(@Body() body: unknown) {
    const input = venueEssentialCreateSchema.parse(body);
    const data = await this.svc.create(input);
    return { success: true, data };
  }

  @Patch(":id")
  @UseGuards(AuthGuard, new RolesGuard(["VENUE_OWNER", "ADMIN"]))
  async update(@Param("id") id: string, @Body() body: unknown) {
    const input = venueEssentialUpdateSchema.parse(body);
    const data = await this.svc.update(id, input);
    return { success: true, data };
  }

  @Delete(":id")
  @UseGuards(AuthGuard, new RolesGuard(["VENUE_OWNER", "ADMIN"]))
  async remove(@Param("id") id: string) {
    await this.svc.remove(id);
    return { success: true, message: "Venue essential archived" };
  }

  // ---------- Booking essentials (attach to booking) ----------

  @Get("bookings/:bookingId")
  @UseGuards(AuthGuard)
  async bookingEssentials(@Param("bookingId") bookingId: string) {
    const data = await this.svc.getBookingEssentials(bookingId);
    return { success: true, data };
  }

  @Post("bookings/:bookingId/attach")
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async attachToBooking(
    @Param("bookingId") bookingId: string,
    @Body() body: unknown,
  ) {
    const raw = typeof body === "object" && body ? body : {};
    const input = attachEssentialsToBookingSchema.parse({ ...raw, bookingId });
    const data = await this.svc.attachEssentialsToBooking(input);
    return { success: true, data };
  }

  // ---------- On-demand orders ----------

  @Post("on-demand")
  @UseGuards(AuthGuard)
  async createOnDemand(@Req() req: any, @Body() body: unknown) {
    const userId = (req.user?.id as string) ?? ((body as any).userId);
    const raw = typeof body === "object" && body ? body : {};
    const input = onDemandOrderCreateSchema.parse({ ...raw, userId });
    const data = await this.svc.createOnDemandOrder(input);
    return { success: true, data };
  }

  @Get("on-demand")
  @UseGuards(AuthGuard)
  async listOnDemand(@Req() req: any) {
    const userId = req.user?.id as string;
    const role = (req.user?.role as string) ?? "USER";
    const data = await this.svc.listOnDemandOrders(userId, role);
    return { success: true, data };
  }

  @Patch("on-demand/:id/status")
  @UseGuards(AuthGuard, new RolesGuard(["VENUE_OWNER", "ADMIN"]))
  async updateOnDemandStatus(@Param("id") id: string, @Body() body: unknown) {
    const input = onDemandOrderUpdateStatusSchema.parse(body);
    const data = await this.svc.updateOnDemandStatus(id, input);
    return { success: true, data };
  }
}
