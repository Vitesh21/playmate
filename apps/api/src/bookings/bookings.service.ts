import { Inject, Injectable, NotFoundException, BadRequestException, ConflictException } from "@nestjs/common";
import { eq, and, inArray, desc, sql } from "drizzle-orm";
import { DRIZZLE_DB, type DrizzleDb } from "@/db/database.module";
import { bookings, type NewBooking, bookingStatusEnum } from "@/db/schema/bookings";
import { courtSlots } from "@/db/schema/court-slots";
import { payments, type NewPayment, paymentStatusEnum, paymentMethodEnum } from "@/db/schema/payments";
import type { BookingCreateInput, PaginationInput } from "@playmate/validation";
import type { PaginatedResponse, BookingStatus, PaymentStatus } from "@playmate/types";
import { RazorpayService } from "@/common/razorpay.service";
import { config } from "@playmate/config";

@Injectable()
export class BookingsService {
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
        .from(bookings)
        .where(eq(bookings.userId, userId))
        .orderBy(desc(bookings.createdAt))
        .limit(perPage)
        .offset(offset),
      this.db.select({ value: sql<number>`count(*)` }).from(bookings).where(eq(bookings.userId, userId)),
    ]);
    const total = Number(totalObj?.value ?? 0);
    return { items, total, page, perPage, totalPages: Math.ceil(total / perPage) };
  }

  async findById(id: string) {
    const [item] = await this.db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    if (!item) throw new NotFoundException("Booking not found");
    return item;
  }

  async create(userId: string, input: BookingCreateInput) {
    return this.db.transaction(async (tx) => {
      const [slot] = await tx
        .select()
        .from(courtSlots)
        .where(
          and(
            eq(courtSlots.id, input.courtSlotId),
            eq(courtSlots.isAvailable, true),
          ),
        )
        .limit(1)
        .for("update", { skipLocked: true });

      if (!slot) {
        throw new ConflictException("Slot is no longer available");
      }

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + config.booking.pendingExpiryMinutes);

      const [booking] = await tx
        .insert(bookings)
        .values({
          userId,
          courtSlotId: input.courtSlotId,
          status: "PENDING" as BookingStatus,
          totalAmount: slot.price,
          expiresAt,
        } satisfies NewBooking)
        .returning();

      await tx.update(courtSlots).set({ isAvailable: false }).where(eq(courtSlots.id, input.courtSlotId));

      const receipt = `${config.payments.receiptPrefix}_BKG_${booking.id.slice(0, 8)}`;
      const rzpOrder = await this.razorpay.createOrder(slot.price * 100, receipt);

      const [payment] = await tx
        .insert(payments)
        .values({
          userId,
          amount: slot.price,
          method: "RAZORPAY",
          status: "PENDING" as PaymentStatus,
          transactionId: rzpOrder.id,
          bookingId: booking.id,
        } satisfies NewPayment)
        .returning();

      await tx.update(bookings).set({ paymentId: payment.id }).where(eq(bookings.id, booking.id));

      return {
        booking: { ...booking, paymentId: payment.id },
        payment,
        razorpayOrder: rzpOrder,
      };
    });
  }

  async confirm(bookingId: string) {
    return this.db.transaction(async (tx) => {
      const [booking] = await tx
        .select()
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1)
        .for("update");

      if (!booking) throw new NotFoundException("Booking not found");
      if (booking.status === "CONFIRMED") return booking;
      if (booking.status !== "PENDING") {
        throw new BadRequestException(`Cannot confirm booking in ${booking.status} state`);
      }

      const [updated] = await tx
        .update(bookings)
        .set({ status: "CONFIRMED" as BookingStatus, updatedAt: new Date() })
        .where(eq(bookings.id, bookingId))
        .returning();

      if (booking.paymentId) {
        await tx
          .update(payments)
          .set({ status: "PAID" as PaymentStatus, updatedAt: new Date() })
          .where(eq(payments.id, booking.paymentId));
      }

      return updated;
    });
  }

  async cancel(bookingId: string) {
    return this.db.transaction(async (tx) => {
      const [booking] = await tx
        .select()
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1)
        .for("update");

      if (!booking) throw new NotFoundException("Booking not found");
      if (booking.status === "CANCELLED" || booking.status === "EXPIRED") return booking;

      const [updated] = await tx
        .update(bookings)
        .set({ status: "CANCELLED" as BookingStatus, updatedAt: new Date() })
        .where(eq(bookings.id, bookingId))
        .returning();

      await tx
        .update(courtSlots)
        .set({ isAvailable: true })
        .where(eq(courtSlots.id, booking.courtSlotId));

      return updated;
    });
  }

  async expirePending() {
    const now = new Date();
    return this.db.transaction(async (tx) => {
      const expired = await tx
        .update(bookings)
        .set({ status: "EXPIRED" as BookingStatus, updatedAt: new Date() })
        .where(and(eq(bookings.status, "PENDING"), sql`${bookings.expiresAt} <= ${now}`))
        .returning();

      if (expired.length > 0) {
        const slotIds = expired.map((b) => b.courtSlotId);
        await tx.update(courtSlots).set({ isAvailable: true }).where(inArray(courtSlots.id, slotIds));
      }

      return expired;
    });
  }
}
