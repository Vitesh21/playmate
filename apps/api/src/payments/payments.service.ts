import { Inject, Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { eq, inArray } from "drizzle-orm";
import { DRIZZLE_DB, type DrizzleDb } from "@/db/database.module";
import { payments } from "@/db/schema/payments";
import type { PaymentStatus } from "@playmate/types";
import { RazorpayService } from "@/common/razorpay.service";
import { BookingsService } from "@/bookings/bookings.service";
import { OrdersService } from "@/orders/orders.service";
import { getConfig } from "@playmate/config";

type VerifyPaymentInput = {
  transactionId: string;
  paymentId: string;
  signature?: string;
};

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDb,
    private readonly razorpay: RazorpayService,
    private readonly bookingsService: BookingsService,
    private readonly ordersService: OrdersService,
  ) {}

  async findById(id: string) {
    const [item] = await this.db.select().from(payments).where(eq(payments.id, id)).limit(1);
    if (!item) throw new NotFoundException("Payment not found");
    return item;
  }

  async findByUser(userId: string) {
    return this.db.select().from(payments).where(eq(payments.userId, userId));
  }

  async getHostedCheckoutData(paymentId: string) {
    const payment = await this.findById(paymentId);
    const config = getConfig();

    return {
      payment,
      keyId: config.NEXT_PUBLIC_RAZORPAY_KEY_ID || config.RAZORPAY_KEY_ID,
      amountInPaise: payment.amount * 100,
      orderId: payment.transactionId ?? "",
      checkoutTitle: payment.bookingId ? "Playmate Court Booking" : "Playmate Order",
      checkoutDescription: payment.bookingId
        ? `Booking ${payment.bookingId.slice(0, 8)}`
        : `Order ${payment.orderId?.slice(0, 8) ?? payment.id.slice(0, 8)}`,
      isMockCheckout: this.isMockTransaction(payment.transactionId),
    };
  }

  async verifyPayment(input: VerifyPaymentInput) {
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.transactionId, input.transactionId))
      .limit(1);

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    if (payment.status === "PAID") {
      return this.resolveLinkedEntities(payment);
    }

    const isMockCheckout = this.isMockTransaction(input.transactionId);
    if (!isMockCheckout) {
      if (!input.signature) {
        throw new BadRequestException("Missing Razorpay signature");
      }

      const isValid = await this.razorpay.verifyPaymentSignature(
        input.transactionId,
        input.paymentId,
        input.signature,
      );

      if (!isValid) {
        throw new BadRequestException("Invalid payment signature");
      }
    }

    const [updatedPayment] = await this.db
      .update(payments)
      .set({
        status: "PAID" as PaymentStatus,
        gatewayResponse: {
          verifiedVia: isMockCheckout ? "mock-checkout" : "razorpay-signature",
          razorpayPaymentId: input.paymentId,
          razorpaySignature: input.signature ?? null,
        },
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id))
      .returning();

    return this.resolveLinkedEntities(updatedPayment ?? payment);
  }

  async handleRazorpayWebhook(rawBody: string, signature: string, payload: any) {
    const valid = await this.razorpay.verifyWebhookSignature(rawBody, signature);
    if (!valid) throw new BadRequestException("Invalid webhook signature");

    const event = payload.event;
    const entity = payload.payload?.payment?.entity ?? payload.payload?.order?.entity;

    if (!entity) return { success: true, message: "No entity in payload" };

    const gatewayIds = [entity.id, entity.order_id].filter(Boolean);
    if (gatewayIds.length === 0) {
      return { success: true, message: "No payment reference in payload" };
    }

    const [payment] = await this.db
      .select()
      .from(payments)
      .where(inArray(payments.transactionId, gatewayIds))
      .limit(1);

    if (!payment) return { success: true, message: "Payment not found" };

    if (event === "payment.captured" || event === "order.paid") {
      await this.db
        .update(payments)
        .set({
          status: "PAID" as PaymentStatus,
          gatewayResponse: payload.payload,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));

      if (payment.bookingId) {
        await this.bookingsService.confirm(payment.bookingId);
      }
      if (payment.orderId) {
        await this.ordersService.confirm(payment.orderId);
      }

      return { success: true, status: "PAID" };
    }

    if (event === "payment.failed") {
      await this.db
        .update(payments)
        .set({
          status: "FAILED" as PaymentStatus,
          gatewayResponse: payload.payload,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));
      return { success: true, status: "FAILED" };
    }

    return { success: true, event, status: "ignored" };
  }

  private async resolveLinkedEntities(payment: typeof payments.$inferSelect) {
    let booking: Awaited<ReturnType<BookingsService["findById"]>> | undefined;
    let order: Awaited<ReturnType<OrdersService["findById"]>> | undefined;

    if (payment.bookingId) {
      await this.bookingsService.confirm(payment.bookingId);
      booking = await this.bookingsService.findById(payment.bookingId);
    }

    if (payment.orderId) {
      await this.ordersService.confirm(payment.orderId);
      order = await this.ordersService.findById(payment.orderId);
    }

    return { payment, booking, order };
  }

  private isMockTransaction(transactionId?: string | null) {
    if (!transactionId) return false;
    return transactionId.startsWith("order_mock_") || transactionId.startsWith("order_dev_");
  }
}
