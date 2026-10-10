import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { OrdersService } from "./orders.service";
import { checkoutSchema, paginationSchema } from "@playmate/validation";
import { AuthGuard } from "@/common/auth.guard";
import { OrderStatus } from "@playmate/types";

export class CheckoutDto extends createZodDto(checkoutSchema) {}
export class UpdateOrderStatusDto extends createZodDto(
  z.object({
    status: z.nativeEnum(OrderStatus),
  }),
) {}
export class OrderPaginationQueryDto extends createZodDto(paginationSchema) {}

@ApiTags("Orders")
@ApiBearerAuth()
@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get("my")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Get current user's orders with pagination" })
  async myOrders(@Req() req: any, @Query() query: OrderPaginationQueryDto) {
    const params = paginationSchema.parse(query);
    const data = await this.ordersService.findByUser(req.user.id, params);
    return { success: true, data };
  }

  @Get(":id")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Get order details by ID" })
  @ApiParam({ name: "id", description: "Order UUID" })
  async findOne(@Param("id") id: string) {
    const data = await this.ordersService.findById(id);
    return { success: true, data };
  }

  @Get(":id/items")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Get line items for an order" })
  @ApiParam({ name: "id", description: "Order UUID" })
  async getItems(@Param("id") id: string) {
    const data = await this.ordersService.getOrderItems(id);
    return { success: true, data };
  }

  @Post("checkout")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Create order from active cart" })
  async checkout(@Req() req: any, @Body() body: CheckoutDto) {
    const data = checkoutSchema.parse(body);
    const result = await this.ordersService.checkout(req.user.id, data);
    return { success: true, data: result };
  }

  @Post(":id/confirm")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Confirm order after payment" })
  @ApiParam({ name: "id", description: "Order UUID" })
  async confirm(@Param("id") id: string) {
    const data = await this.ordersService.confirm(id);
    return { success: true, data };
  }

  @Patch(":id/status")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Update order status" })
  @ApiParam({ name: "id", description: "Order UUID" })
  async updateStatus(@Param("id") id: string, @Body() body: UpdateOrderStatusDto) {
    const data = await this.ordersService.updateStatus(id, body.status);
    return { success: true, data };
  }
}

