import { Inject, Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { eq, and, desc, count, inArray, sql } from "drizzle-orm";
import { DRIZZLE_DB, type DrizzleDb } from "@/db/database.module";
import { orders, orderItems, type NewOrder, type NewOrderItem, orderStatusEnum } from "@/db/schema/orders";
import { payments, type NewPayment, paymentStatusEnum } from "@/db/schema/payments";
import { cartItems, carts } from "@/db/schema/cart";
import { productVariants } from "@/db/schema/product-variants";
import { products } from "@/db/schema/products";
import { inventory } from "@/db/schema/inventory";
import type { CheckoutInput, PaginationInput } from "@playmate/validation";
import type { PaginatedResponse, OrderStatus, PaymentStatus } from "@playmate/types";
import { RazorpayService } from "@/common/razorpay.service";
import { config } from "@playmate/config";

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDb,
    private readonly razorpay: RazorpayService,
  ) {}

  async findByUser(userId: string, params: PaginationInput): Promise<PaginatedResponse<any>> {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 10;
    const offset = (page - 1) * perPage;

    const [items, [totalObj]] = await Promise.all([
      this.db
        .select()
        .from(orders)
        .where(eq(orders.userId, userId))
        .orderBy(desc(orders.createdAt))
        .limit(perPage)
        .offset(offset),
      this.db.select({ value: count() }).from(orders).where(eq(orders.userId, userId)),
    ]);
    const total = Number(totalObj?.value ?? 0);
    return { items, total, page, perPage, totalPages: Math.ceil(total / perPage) };
  }

  async findById(id: string) {
    const [item] = await this.db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!item) throw new NotFoundException("Order not found");
    return item;
  }

  async getOrderItems(orderId: string) {
    return this.db
      .select({
        ...Object.fromEntries(Object.keys(orderItems).map((k) => [k, (orderItems as any)[k]])),
        variant: productVariants,
        product: products,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))
      .innerJoin(productVariants, eq(productVariants.id, orderItems.variantId))
      .innerJoin(products, eq(products.id, productVariants.productId));
  }

  async checkout(userId: string, input: CheckoutInput) {
    return this.db.transaction(async (tx) => {
      const [cart] = await tx.select().from(carts).where(eq(carts.userId, userId)).limit(1).for("update");
      if (!cart) throw new BadRequestException("Cart is empty");

      const items = await tx
        .select({
          id: cartItems.id,
          variantId: cartItems.variantId,
          quantity: cartItems.quantity,
          variant: productVariants,
        })
        .from(cartItems)
        .where(eq(cartItems.cartId, cart.id))
        .innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
        .for("update");

      if (items.length === 0) throw new BadRequestException("Cart is empty");

      const variantIds = items.map((i) => i.variantId);
      const invRecords = await tx
        .select()
        .from(inventory)
        .where(inArray(inventory.variantId, variantIds))
        .for("update");

      const invMap = new Map(invRecords.map((i) => [i.variantId, i]));
      for (const item of items) {
        const inv = invMap.get(item.variantId);
        const avail = (inv?.quantity ?? 0) - (inv?.reservedQuantity ?? 0);
        if (avail < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for variant ${item.variantId}. Available: ${avail}`,
          );
        }
      }

      const subtotal = items.reduce(
        (s, item) => s + (item.variant?.price ?? 0) * item.quantity,
        0,
      );
      const tax = Math.round(subtotal * 0.18);
      const shipping = subtotal >= 999 ? 0 : 49;
      const discount = 0;
      const totalAmount = subtotal + tax + shipping - discount;

      const [order] = await tx
        .insert(orders)
        .values({
          userId,
          status: "PENDING" as OrderStatus,
          subtotal,
          tax,
          shipping,
          discount,
          totalAmount,
          shippingAddress: input.shippingAddress as any,
          billingAddress: input.billingAddress as any,
        } satisfies NewOrder)
        .returning();

      const orderItemValues: NewOrderItem[] = items.map((item) => ({
        orderId: order.id,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.variant?.price ?? 0,
        totalPrice: (item.variant?.price ?? 0) * item.quantity,
      }));
      await tx.insert(orderItems).values(orderItemValues);

      for (const item of items) {
        await tx
          .update(inventory)
          .set({
            reservedQuantity: sql`${inventory.reservedQuantity} + ${item.quantity}`,
            quantity: sql`${inventory.quantity} - ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(inventory.variantId, item.variantId));
      }

      await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id));

      const receipt = `${config.payments.receiptPrefix}_ORD_${order.id.slice(0, 8)}`;
      const rzpOrder = await this.razorpay.createOrder(totalAmount * 100, receipt);

      const [payment] = await tx
        .insert(payments)
        .values({
          userId,
          amount: totalAmount,
          method: "RAZORPAY",
          status: "PENDING" as PaymentStatus,
          transactionId: rzpOrder.id,
          orderId: order.id,
        } satisfies NewPayment)
        .returning();

      await tx.update(orders).set({ paymentId: payment.id }).where(eq(orders.id, order.id));

      return {
        order: { ...order, paymentId: payment.id },
        payment,
        razorpayOrder: rzpOrder,
      };
    });
  }

  async confirm(orderId: string) {
    return this.db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1).for("update");
      if (!order) throw new NotFoundException("Order not found");
      if (order.status === "CONFIRMED") return order;
      if (order.status !== "PENDING") {
        throw new BadRequestException(`Cannot confirm order in ${order.status} state`);
      }

      const [updated] = await tx
        .update(orders)
        .set({ status: "CONFIRMED" as OrderStatus, updatedAt: new Date() })
        .where(eq(orders.id, orderId))
        .returning();

      if (order.paymentId) {
        await tx
          .update(payments)
          .set({ status: "PAID" as PaymentStatus, updatedAt: new Date() })
          .where(eq(payments.id, order.paymentId));
      }

      return updated;
    });
  }

  async updateStatus(orderId: string, status: OrderStatus) {
    const [updated] = await this.db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();
    if (!updated) throw new NotFoundException("Order not found");
    return updated;
  }
}
