import { Inject, Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { DRIZZLE_DB, type DrizzleDb } from "@/db/database.module";
import { carts, cartItems, type NewCart, type NewCartItem } from "@/db/schema/cart";
import { productVariants } from "@/db/schema/product-variants";
import { products } from "@/db/schema/products";
import type { CartItemAddInput, CartItemUpdateInput } from "@playmate/validation";

@Injectable()
export class CartService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async getOrCreateCart(userId: string) {
    const [existing] = await this.db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
    if (existing) return existing;
    const [created] = await this.db.insert(carts).values({ userId } satisfies NewCart).returning();
    if (!created) throw new Error("Failed to create cart");
    return created;
  }

  async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    const items = await this.db
      .select({
        id: cartItems.id,
        cartId: cartItems.cartId,
        variantId: cartItems.variantId,
        quantity: cartItems.quantity,
        variant: productVariants,
        product: products,
      })
      .from(cartItems)
      .innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(eq(cartItems.cartId, cart.id));

    const subtotal = items.reduce((sum, item) => sum + (item.variant?.price ?? 0) * item.quantity, 0);

    return { ...cart, items, subtotal, itemCount: items.reduce((s, i) => s + i.quantity, 0) };
  }

  async addItem(userId: string, input: CartItemAddInput) {
    return this.db.transaction(async (tx) => {
      const [variant] = await tx
        .select({ id: productVariants.id, price: productVariants.price })
        .from(productVariants)
        .where(eq(productVariants.id, input.variantId))
        .limit(1);
      if (!variant) throw new NotFoundException("Product variant not found");

      const cart = await this.getOrCreateCart(userId);

      const [existing] = await tx
        .select()
        .from(cartItems)
        .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.variantId, input.variantId)))
        .limit(1);

      if (existing) {
        const [updated] = await tx
          .update(cartItems)
          .set({ quantity: existing.quantity + input.quantity, updatedAt: new Date() })
          .where(eq(cartItems.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await tx
        .insert(cartItems)
        .values({
          cartId: cart.id,
          variantId: input.variantId,
          quantity: input.quantity,
        } satisfies NewCartItem)
        .returning();
      return created;
    });
  }

  async updateItem(userId: string, itemId: string, input: CartItemUpdateInput) {
    const cart = await this.getOrCreateCart(userId);
    const [item] = await this.db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)))
      .limit(1);
    if (!item) throw new NotFoundException("Cart item not found");

    const [updated] = await this.db
      .update(cartItems)
      .set({ quantity: input.quantity, updatedAt: new Date() })
      .where(eq(cartItems.id, itemId))
      .returning();
    return updated;
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.getOrCreateCart(userId);
    const [deleted] = await this.db
      .delete(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)))
      .returning();
    if (!deleted) throw new NotFoundException("Cart item not found");
    return deleted;
  }

  async clear(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    await this.db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
    return true;
  }
}
