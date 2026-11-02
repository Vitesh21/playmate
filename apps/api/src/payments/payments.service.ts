git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-8Plbhfll' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-mGhzH8Y4' (errno=Operation not permitted)
import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  GoneException,
  ServiceUnavailableException,
} from "@nestjs/common";
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

    if (payment.bookingId) {
      const booking = await this.bookingsService.findById(payment.bookingId);
      if (
        booking.status !== "PENDING" ||
        (booking.expiresAt && booking.expiresAt <= new Date())
      ) {
        throw new GoneException("This booking's payment window has expired");
      }
    }

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
    if (payment.status === "REFUNDED") {
      throw new ConflictException("This payment has already been refunded");
    }

    const config = getConfig();
    const isMockCheckout = this.isMockTransaction(input.transactionId);
    if (isMockCheckout && (config.NODE_ENV === "production" || !config.ALLOW_MOCK_PAYMENTS)) {
      throw new BadRequestException("Mock payment verification is disabled");
    }
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

      let gatewayPayment = await this.razorpay.fetchPayment(input.paymentId);
      const expectedAmount = payment.amount * 100;
      if (
        gatewayPayment.order_id !== input.transactionId ||
        gatewayPayment.amount !== expectedAmount ||
        gatewayPayment.currency !== "INR"
      ) {
        throw new BadRequestException("Payment does not match this booking amount");
      }

      if (gatewayPayment.status === "authorized") {
        gatewayPayment = await this.razorpay.capturePayment(input.paymentId, expectedAmount);
      }
      if (gatewayPayment.status !== "captured") {
        throw new BadRequestException("Payment has not been captured yet");
      }
    }

    const gatewayResponse = {
      verifiedVia: isMockCheckout ? "mock-checkout" : "razorpay-signature",
      razorpayPaymentId: input.paymentId,
      razorpaySignature: input.signature ?? null,
    };

    let linkedEntities: Awaited<ReturnType<PaymentsService["resolveLinkedEntities"]>>;
    try {
      linkedEntities = await this.resolveLinkedEntities({
        ...payment,
        status: "PAID",
        gatewayResponse,
      });
    } catch (error) {
      if (isMockCheckout) throw error;

      let refund: unknown;
      try {
        refund = await this.razorpay.refundPayment(input.paymentId, payment.amount * 100);
      } catch (refundError) {
        await this.db
          .update(payments)
          .set({
            status: "PAID" as PaymentStatus,
            gatewayResponse: {
              ...gatewayResponse,
              refundFailure:
                refundError instanceof Error ? refundError.message : "Refund failed",
              reconciliationRequired: true,
            },
            updatedAt: new Date(),
          })
          .where(eq(payments.id, payment.id));
        throw new ServiceUnavailableException(
          "Payment was captured but the booking could not be confirmed or refunded automatically. Support review is required.",
        );
      }

      await this.db
        .update(payments)
        .set({
          status: "REFUNDED" as PaymentStatus,
          gatewayResponse: { ...gatewayResponse, refund },
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));
      throw new ConflictException("Payment arrived after the slot hold expired. A refund has been initiated.");
    }

    const [updatedPayment] = await this.db
      .update(payments)
      .set({
        status: "PAID" as PaymentStatus,
        gatewayResponse,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id))
      .returning();

    return { ...linkedEntities, payment: updatedPayment ?? linkedEntities.payment };
  }

  async handleRazorpayWebhook(rawBody: string | Buffer, signature: string, payload: any) {
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
    if (payment.status === "REFUNDED") {
      return { success: true, status: "REFUNDED", message: "Payment was already refunded" };
    }

    const isCapturedPayment = event === "payment.captured" &&
      entity.order_id === payment.transactionId &&
      entity.amount === payment.amount * 100 &&
      entity.currency === "INR";
    const isPaidOrder = event === "order.paid" &&
      entity.id === payment.transactionId &&
      entity.amount_paid === payment.amount * 100 &&
      entity.currency === "INR";

    if (isCapturedPayment || isPaidOrder) {
      try {
        await this.resolveLinkedEntities({
          ...payment,
          status: "PAID",
          gatewayResponse: payload.payload,
        });
      } catch (error) {
        let paymentId: string | undefined = event === "payment.captured" ? entity.id : undefined;
        if (!paymentId && event === "order.paid") {
          const orderPayments = await this.razorpay.fetchPaymentsForOrder(payment.transactionId!);
          paymentId = orderPayments.items.find(
            (item) => item.status === "captured" && item.amount === payment.amount * 100,
          )?.id;
        }
        if (!paymentId) throw error;
        try {
          const refund = await this.razorpay.refundPayment(paymentId, payment.amount * 100);
          await this.db
            .update(payments)
            .set({
              status: "REFUNDED" as PaymentStatus,
              gatewayResponse: { ...payload.payload, refund },
              updatedAt: new Date(),
            })
            .where(eq(payments.id, payment.id));
          return { success: true, status: "REFUNDED" };
        } catch (refundError) {
          await this.db
            .update(payments)
            .set({
              status: "PAID" as PaymentStatus,
              gatewayResponse: {
                ...payload.payload,
                refundFailure:
                  refundError instanceof Error ? refundError.message : "Refund failed",
                reconciliationRequired: true,
              },
              updatedAt: new Date(),
            })
            .where(eq(payments.id, payment.id));
          throw refundError;
        }
      }

      await this.db
        .update(payments)
        .set({ status: "PAID" as PaymentStatus, gatewayResponse: payload.payload, updatedAt: new Date() })
        .where(eq(payments.id, payment.id));

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
