import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { checkoutSchema, paginationSchema } from "@playmate/validation";
import { AuthGuard } from "@/common/auth.guard";
import { OrderStatus } from "@playmate/types";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get("my")
  @UseGuards(AuthGuard)
  async myOrders(@Req() req: any, @Query() query: Record<string, any>) {
    const params = paginationSchema.parse(query);
    const data = await this.ordersService.findByUser(req.user.id, params);
    return { success: true, data };
  }

  @Get(":id")
  @UseGuards(AuthGuard)
  async findOne(@Param("id") id: string) {
    const data = await this.ordersService.findById(id);
    return { success: true, data };
  }

  @Get(":id/items")
  @UseGuards(AuthGuard)
  async getItems(@Param("id") id: string) {
    const data = await this.ordersService.getOrderItems(id);
    return { success: true, data };
  }

  @Post("checkout")
  @UseGuards(AuthGuard)
  async checkout(@Req() req: any, @Body() body: unknown) {
    const data = checkoutSchema.parse(body);
    const result = await this.ordersService.checkout(req.user.id, data);
    return { success: true, data: result };
  }

  @Post(":id/confirm")
  @UseGuards(AuthGuard)
  async confirm(@Param("id") id: string) {
    const data = await this.ordersService.confirm(id);
    return { success: true, data };
  }

  @Patch(":id/status")
  @UseGuards(AuthGuard)
  async updateStatus(@Param("id") id: string, @Body() body: { status: OrderStatus }) {
    const data = await this.ordersService.updateStatus(id, body.status);
    return { success: true, data };
  }
}
