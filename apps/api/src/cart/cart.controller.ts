import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { CartService } from "./cart.service";
import { cartItemAddSchema, cartItemUpdateSchema } from "@playmate/validation";
import { AuthGuard } from "@/common/auth.guard";

export class AddCartItemDto extends createZodDto(cartItemAddSchema) {}
export class UpdateCartItemDto extends createZodDto(cartItemUpdateSchema) {}

@ApiTags("Cart")
@ApiBearerAuth()
@Controller("cart")
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Get current user's cart" })
  async getCart(@Req() req: any) {
    const data = await this.cartService.getCart(req.user.id);
    return { success: true, data };
  }

  @Post("items")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Add an item to the cart" })
  async addItem(@Req() req: any, @Body() body: AddCartItemDto) {
    const data = cartItemAddSchema.parse(body);
    const item = await this.cartService.addItem(req.user.id, data);
    return { success: true, data: item };
  }

  @Patch("items/:id")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Update quantity of a cart item" })
  @ApiParam({ name: "id", description: "Cart item UUID" })
  async updateItem(@Req() req: any, @Param("id") id: string, @Body() body: UpdateCartItemDto) {
    const data = cartItemUpdateSchema.parse(body);
    const item = await this.cartService.updateItem(req.user.id, id, data);
    return { success: true, data: item };
  }

  @Delete("items/:id")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Remove an item from the cart" })
  @ApiParam({ name: "id", description: "Cart item UUID" })
  async removeItem(@Req() req: any, @Param("id") id: string) {
    await this.cartService.removeItem(req.user.id, id);
    return { success: true, message: "Item removed from cart" };
  }

  @Delete()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Clear entire cart" })
  async clear(@Req() req: any) {
    await this.cartService.clear(req.user.id);
    return { success: true, message: "Cart cleared" };
  }
}

