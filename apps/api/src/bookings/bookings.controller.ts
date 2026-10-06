import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { BookingsService } from "./bookings.service";
import { bookingCreateSchema, paginationSchema } from "@playmate/validation";
import { AuthGuard } from "@/common/auth.guard";

@Controller("bookings")
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get("my")
  @UseGuards(AuthGuard)
  async myBookings(@Req() req: any, @Query() query: Record<string, any>) {
    const params = paginationSchema.parse(query);
    const data = await this.bookingsService.findByUser(req.user.id, params);
    return { success: true, data };
  }

  @Get(":id")
  @UseGuards(AuthGuard)
  async findOne(@Param("id") id: string) {
    const data = await this.bookingsService.findById(id);
    return { success: true, data };
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(@Req() req: any, @Body() body: unknown) {
    const data = bookingCreateSchema.parse(body);
    const result = await this.bookingsService.create(req.user.id, data);
    return { success: true, data: result };
  }

  @Post(":id/confirm")
  @UseGuards(AuthGuard)
  async confirm(@Param("id") id: string) {
    const data = await this.bookingsService.confirm(id);
    return { success: true, data };
  }

  @Delete(":id")
  @UseGuards(AuthGuard)
  async cancel(@Param("id") id: string) {
    await this.bookingsService.cancel(id);
    return { success: true, message: "Booking cancelled" };
  }

  @Post("expire-pending")
  async expirePending() {
    const expired = await this.bookingsService.expirePending();
    return { success: true, data: { count: expired.length } };
  }
}
