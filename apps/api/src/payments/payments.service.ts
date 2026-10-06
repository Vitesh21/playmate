import { Inject, Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE_DB, type DrizzleDb } from "@/db/database.module";
import { payments, paymentStatusEnum, type NewPayment } from "@/db/schema/payments";
import { bookings } from "@/db/schema/bookings";
import { orders } from "@/db/schema/orders";
import type { PaymentStatus } from "@playmate/types";
import { RazorpayService } from "@/common/razorpay.service";
import { BookingsService } from "@/bookings/bookings.service";
import { OrdersService } from "@/orders/orders.service";

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

  async handleRazorpayWebhook(rawBody: string, signature: string, payload: any) {
    const valid = await this.razorpay.verifyWebhookSignature(rawBody, signature);
    if (!valid) throw new BadRequestException("Invalid webhook signature");

    const event = payload.event;
    const entity = payload.payload?.payment?.entity ?? payload.payload?.order?.entity;

    if (!entity) return { success: true, message: "No entity in payload" };

    const transactionId = entity.id;

    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.transactionId, transactionId))
      .limit(1);

    if (!payment) return { success: true, message: "Payment not found" };

    if (event === "payment.captured" || event === "order.paid") {
      return this.db.transaction(async (tx) => {
        await tx
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
      });
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
}
