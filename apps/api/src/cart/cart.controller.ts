import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { CartService } from "./cart.service";
import { cartItemAddSchema, cartItemUpdateSchema } from "@playmate/validation";
import { AuthGuard } from "@/common/auth.guard";

@Controller("cart")
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @UseGuards(AuthGuard)
  async getCart(@Req() req: any) {
    const data = await this.cartService.getCart(req.user.id);
    return { success: true, data };
  }

  @Post("items")
  @UseGuards(AuthGuard)
  async addItem(@Req() req: any, @Body() body: unknown) {
    const data = cartItemAddSchema.parse(body);
    const item = await this.cartService.addItem(req.user.id, data);
    return { success: true, data: item };
  }

  @Patch("items/:id")
  @UseGuards(AuthGuard)
  async updateItem(@Req() req: any, @Param("id") id: string, @Body() body: unknown) {
    const data = cartItemUpdateSchema.parse(body);
    const item = await this.cartService.updateItem(req.user.id, id, data);
    return { success: true, data: item };
  }

  @Delete("items/:id")
  @UseGuards(AuthGuard)
  async removeItem(@Req() req: any, @Param("id") id: string) {
    await this.cartService.removeItem(req.user.id, id);
    return { success: true, message: "Item removed from cart" };
  }

  @Delete()
  @UseGuards(AuthGuard)
  async clear(@Req() req: any) {
    await this.cartService.clear(req.user.id);
    return { success: true, message: "Cart cleared" };
  }
}
