import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { BookingsService } from "./bookings.service";
import { bookingCreateSchema, paginationSchema } from "@playmate/validation";
import { AuthGuard, RolesGuard } from "@/common/auth.guard";
import { UserRole } from "@playmate/types";

export class CreateBookingDto extends createZodDto(bookingCreateSchema) {}
export class BookingPaginationQueryDto extends createZodDto(paginationSchema) {}

@ApiTags("Bookings")
@Controller("bookings")
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get("my")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user's bookings with pagination" })
  async myBookings(@Req() req: any, @Query() query: BookingPaginationQueryDto) {
    const params = paginationSchema.parse(query);
    const data = await this.bookingsService.findByUser(req.user.id, params);
    return { success: true, data };
  }

  @Get(":id")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get booking by ID" })
  @ApiParam({ name: "id", description: "Booking UUID" })
  async findOne(@Req() req: any, @Param("id") id: string) {
    const data = await this.bookingsService.findById(id, req.user.id);
    return { success: true, data };
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new court booking" })
  async create(@Req() req: any, @Body() body: CreateBookingDto) {
    const data = bookingCreateSchema.parse(body);
    const result = await this.bookingsService.create(req.user.id, data);
    return { success: true, data: result };
  }

  @Delete(":id")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cancel booking" })
  @ApiParam({ name: "id", description: "Booking UUID" })
  async cancel(@Req() req: any, @Param("id") id: string) {
    await this.bookingsService.cancel(id, req.user.id);
    return { success: true, message: "Booking cancelled" };
  }

  @Post("expire-pending")
  @UseGuards(AuthGuard, new RolesGuard([UserRole.ADMIN]))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Expire stale pending bookings (cron / maintenance)" })
  async expirePending() {
    const expired = await this.bookingsService.expirePending();
    return { success: true, data: { count: expired.length } };
  }
}

