/**
 * Bookings Service — Court slot reservation state machine.
 *
 * Core domain: a User can book an available courtSlot for a specific price.
 *
 * Transactional concurrency is the central concern here. Because two users
 * could click "Book" on the SAME court slot at nearly the same moment, all
 * writes go through a Postgres transaction with row-level locking:
 *
 *   CREATE flow:
 *     1. BEGIN tx
 *     2. SELECT ... FROM courtSlots WHERE id=X AND isAvailable=true
 *          FOR UPDATE SKIP LOCKED ← critical: if row is already locked by
 *          another tx, SKIP it (don't wait) → 0 rows back → ConflictException.
 *          This guarantees "no double booking" WITHOUT deadlock risks.
 *     3. INSERT booking with status PENDING + expiresAt (+N minutes).
 *     4. UPDATE courtSlots SET isAvailable=false ← "flip" the slot to taken.
 *     5. Call Razorpay to create an Order (payment intent in INR paisa).
 *     6. INSERT payments row (PENDING) and link to booking.paymentId.
 *     7. COMMIT tx.
 *
 * State machine for booking.status (bookingStatusEnum):
 *
 *              ┌───────────────┐
 *              │    PENDING    │ ← initial state; has expiresAt deadline
 *              └───┬───┬───────┘
 *          success │   │ timeout / cron
 *                  ▼   ▼
 *           ┌──────────┐  ┌───────────┐
 *           │CONFIRMED │  │  EXPIRED  │
 *           └──────────┘  └───────────┘
 *                   │
 *                   │ user cancels
 *                   ▼
 *              ┌───────────┐
 *              │ CANCELLED │
 *              └───────────┘
 *
 *   • PENDING → CONFIRMED: on successful Razorpay payment (webhook or manual verify).
 *   • PENDING → EXPIRED:   by `expirePending()` cron job after expiresAt passes.
 *                          Frees the slot back to isAvailable=true.
 *   • PENDING → CANCELLED: user-initiated cancel; also frees the slot.
 *   • CONFIRMED → CANCELLED: allowed (cancellation after payment; refunds
 *     handled outside this service today).
 */

import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { eq, and, inArray, desc, sql, or, gt, lt } from "drizzle-orm";
import { DRIZZLE_DB, type DrizzleDb } from "@/db/database.module";
import { bookingSlots, bookings, type NewBooking, bookingStatusEnum } from "@/db/schema/bookings";
import { courtSlots } from "@/db/schema/court-slots";
import { courts } from "@/db/schema/courts";
import { venues } from "@/db/schema/venues";
import { payments, type NewPayment, paymentStatusEnum, paymentMethodEnum } from "@/db/schema/payments";
import type { BookingCreateInput, PaginationInput } from "@playmate/validation";
import type { PaginatedResponse, BookingStatus, PaymentStatus } from "@playmate/types";
import { RazorpayService } from "@/common/razorpay.service";
import { config } from "@playmate/config";

export function orderAndValidateConsecutiveSlots<T extends { courtId: string; date: string; startTime: string; endTime: string }>(slots: T[]): T[] {
  if (slots.length < 1 || slots.length > 10) throw new BadRequestException("Choose between 1 and 10 slots");
  const ordered = [...slots].sort((left, right) => left.date.localeCompare(right.date) || left.startTime.localeCompare(right.startTime));
  const first = ordered[0]!;
  if (ordered.some((slot) => slot.courtId !== first.courtId || slot.date !== first.date)) {
    throw new BadRequestException("A multi-slot booking must use one court on one date");
  }
  if (ordered.some((slot, index) => index > 0 && ordered[index - 1]!.endTime !== slot.startTime)) {
    throw new BadRequestException("Choose consecutive slots without gaps");
  }
  return ordered;
}

@Injectable()
export class BookingsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BookingsService.name);
  private expiryTimer?: NodeJS.Timeout;

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDb,
    private readonly razorpay: RazorpayService,
  ) {}

  onModuleInit() {
    this.expiryTimer = setInterval(() => {
      void this.expirePending().catch((error: unknown) => {
        this.logger.error("Failed to expire pending bookings", error);
      });
    }, 30_000);
    this.expiryTimer.unref();
  }

  onModuleDestroy() {
    if (this.expiryTimer) clearInterval(this.expiryTimer);
  }

  /**
   * Paginated listing of bookings for a single user.
   * Sorted newest-first (by createdAt desc). Returns the standard
   * PaginatedResponse envelope: { items, total, page, perPage, totalPages }.
   * Uses Promise.all so the count query and page query run in parallel.
   */
  async findByUser(userId: string, params: PaginationInput): Promise<PaginatedResponse<any>> {
    // Defaults: page 1, 10 items per page.
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 10;
    const offset = (page - 1) * perPage;

    const [items, [totalObj]] = await Promise.all([
      // One page of rows: newest-first
      this.db
        .select({ booking: bookings, courtSlot: courtSlots, court: courts, venue: venues })
        .from(bookings)
        .leftJoin(courtSlots, eq(bookings.courtSlotId, courtSlots.id))
        .leftJoin(courts, eq(courtSlots.courtId, courts.id))
        .leftJoin(venues, eq(courts.venueId, venues.id))
        .where(eq(bookings.userId, userId))
        .orderBy(desc(bookings.createdAt))
        .limit(perPage)
        .offset(offset),
      // Parallel COUNT(*) for pagination totals
      this.db.select({ value: sql<number>`count(*)` }).from(bookings).where(eq(bookings.userId, userId)),
    ]);
    const total = Number(totalObj?.value ?? 0);
    const bookingIds = items.map(({ booking }) => booking.id);
    const linkedSlots = bookingIds.length ? await this.db.select({ bookingId: bookingSlots.bookingId, courtSlot: courtSlots, court: courts, venue: venues })
      .from(bookingSlots)
      .innerJoin(courtSlots, eq(courtSlots.id, bookingSlots.courtSlotId))
      .innerJoin(courts, eq(courts.id, courtSlots.courtId))
      .innerJoin(venues, eq(venues.id, courts.venueId))
      .orderBy(courtSlots.date, courtSlots.startTime)
      .where(inArray(bookingSlots.bookingId, bookingIds)) : [];
    const slotsByBooking = new Map<string, typeof linkedSlots>();
    linkedSlots.forEach((row) => slotsByBooking.set(row.bookingId, [...(slotsByBooking.get(row.bookingId) ?? []), row]));
    return {
      items: items.map(({ booking, courtSlot, court, venue }) => ({
        ...booking,
        courtSlot,
        court,
        venue,
        courtSlots: slotsByBooking.get(booking.id)?.map(({ courtSlot: linkedCourtSlot, court: linkedCourt, venue: linkedVenue }) => ({ courtSlot: linkedCourtSlot, court: linkedCourt, venue: linkedVenue })) ?? (courtSlot ? [{ courtSlot, court, venue }] : []),
      })),
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };
  }

  /**
   * Fetch a single booking by primary key. Throws 404 if missing.
   * No row lock — safe for read-only display endpoints.
   */
  async findById(id: string, userId?: string) {
    const [item] = await this.db
      .select()
      .from(bookings)
      .where(userId ? and(eq(bookings.id, id), eq(bookings.userId, userId)) : eq(bookings.id, id))
      .limit(1);
    if (!item) throw new NotFoundException("Booking not found");
    return item;
  }

  /**
   * CREATE BOOKING — the heart of the module.
   *
   * All work is wrapped in a Drizzle transaction so that either ALL of the
   * following happen, or NOTHING:
   *   • courtSlot is reserved (isAvailable flipped, locked for update)
   *   • booking row is written as PENDING with an expiration window
   *   • Razorpay order is created (outbound HTTP call inside tx — acceptable
   *     because if Razorpay fails the entire tx rolls back, releasing the slot)
   *   • payments row linked to the booking
   *
   * Concurrency lock strategy on courtSlots:
   *   FOR UPDATE + SKIP LOCKED
   *     • FOR UPDATE: takes an exclusive row lock so no other transaction
   *       can modify/isAvailable-check this slot until we commit/rollback.
   *     • SKIP LOCKED: if another tx already holds the lock, don't BLOCK
   *       waiting for it — return 0 rows immediately. We interpret that as
   *       "slot is currently being booked by someone else" → 409 Conflict.
   *
   * This avoids the classic lost-update race where two SELECTs both read
   * isAvailable=true, then both INSERT bookings → double booking.
   */
  async create(userId: string, input: BookingCreateInput) {
    return this.db.transaction(async (tx) => {
      const requestedSlotIds = input.courtSlotIds?.length ? input.courtSlotIds : input.courtSlotId ? [input.courtSlotId] : [];
      if (!requestedSlotIds.length) throw new BadRequestException("Select at least one available slot");
      if (new Set(requestedSlotIds).size !== requestedSlotIds.length) throw new BadRequestException("Choose each time slot only once");

      // Lock every slot in a stable order so overlapping multi-slot checkouts cannot race.
      const lockedSlots = await tx
        .select()
        .from(courtSlots)
        .where(
          and(
            inArray(courtSlots.id, requestedSlotIds),
            eq(courtSlots.isAvailable, true),
          ),
        )
        .orderBy(courtSlots.id)
        .for("update", { skipLocked: true });

      if (lockedSlots.length !== requestedSlotIds.length) throw new ConflictException("One or more selected slots are no longer available");
      const slots = orderAndValidateConsecutiveSlots(lockedSlots);
      const firstSlot = slots[0]!;

      // Step 2: compute the PENDING window. If the user doesn't complete
      // payment within this many minutes, the booking is auto-expired and
      // the slot is freed (see expirePending() + the cron that calls it).
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + config.booking.pendingExpiryMinutes);

      const [activeBooking] = await tx.select({ id: bookings.id }).from(bookings)
        .leftJoin(bookingSlots, eq(bookingSlots.bookingId, bookings.id))
        .where(and(
          or(inArray(bookings.courtSlotId, requestedSlotIds), inArray(bookingSlots.courtSlotId, requestedSlotIds)),
          or(eq(bookings.status, "CONFIRMED"), and(eq(bookings.status, "PENDING"), gt(bookings.expiresAt, new Date()))),
        ))
        .limit(1);

      if (activeBooking) {
        throw new ConflictException("Slot is currently held for payment");
      }

      // Step 3: insert the PENDING booking row
      const [booking] = await tx
        .insert(bookings)
        .values({
          userId,
          courtSlotId: firstSlot.id,
          status: "PENDING" as BookingStatus,
          totalAmount: slots.reduce((total, slot) => total + slot.price, 0), // Prices come from the database, never the client.
          expiresAt,
        } satisfies NewBooking)
        .returning();

      if (!booking) throw new Error("Failed to create booking");

      await tx.insert(bookingSlots).values(slots.map((slot) => ({ bookingId: booking.id, courtSlotId: slot.id })));
      await tx.update(courtSlots).set({ isAvailable: false, updatedAt: new Date() }).where(inArray(courtSlots.id, requestedSlotIds));

      // Step 4: create Razorpay Order (payment intent).
      // Receipt format: "<prefix>_BKG_<shortBookingId>"
      // NOTE: ×100 because Razorpay takes PAISA (not whole INR rupees).
      const receipt = `${config.payments.receiptPrefix}_BKG_${booking.id.slice(0, 8)}`;
      const rzpOrder = await this.razorpay.createOrder(booking.totalAmount * 100, receipt);

      // Step 5: write our local payments record, linked to the booking
      const [payment] = await tx
        .insert(payments)
        .values({
          userId,
          amount: booking.totalAmount,
          method: "RAZORPAY",
          status: "PENDING" as PaymentStatus,
          transactionId: rzpOrder.id, // store Razorpay's order_XXX id for later webhook matching
          bookingId: booking.id,
        } satisfies NewPayment)
        .returning();

      // Step 6: backfill booking.paymentId (we needed booking.id to create
      // the payment, so this is a 2-step link).
      await tx.update(bookings).set({ paymentId: payment.id }).where(eq(bookings.id, booking.id));

      // Return all three objects to the caller (controller). Controller
      // forwards razorpayOrder to the frontend so it can open Checkout.
      return {
        booking: { ...booking, paymentId: payment.id },
        payment,
        razorpayOrder: rzpOrder,
      };
    });
  }

  /**
   * CONFIRM BOOKING — called after payment succeeds (webhook or manual
   * signature verification).
   *
   * Allowed transition: PENDING → CONFIRMED.
   * Idempotent: if already CONFIRMED, short-circuits and returns the row
   * (safe for retries / duplicate webhook delivery).
   *
   * Side-effects when transitioning:
   *   • booking.status = CONFIRMED
   *   • IF a paymentId is linked: payments.status = PAID
   *
   * Uses SELECT ... FOR UPDATE on the booking row to prevent concurrent
   * confirm/cancel/expire from racing.
   */
  async confirm(bookingId: string) {
    return this.db.transaction(async (tx) => {
      // Lock the booking row for the duration of the tx
      const [booking] = await tx
        .select()
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1)
        .for("update");

      if (!booking) throw new NotFoundException("Booking not found");
      // Idempotency: already confirmed → return, don't error
      if (booking.status === "CONFIRMED") return booking;
      // State-machine guard: only PENDING can become CONFIRMED
      if (booking.status !== "PENDING") {
        throw new BadRequestException(`Cannot confirm booking in ${booking.status} state`);
      }
      if (booking.expiresAt && booking.expiresAt <= new Date()) {
        throw new ConflictException("The payment window for this booking has expired");
      }

      // Transition to CONFIRMED
      const [updated] = await tx
        .update(bookings)
        .set({ status: "CONFIRMED" as BookingStatus, updatedAt: new Date() })
        .where(eq(bookings.id, bookingId))
        .returning();

      // Also flip the linked payment record to PAID, if present
      if (booking.paymentId) {
        await tx
          .update(payments)
          .set({ status: "PAID" as PaymentStatus, updatedAt: new Date() })
          .where(eq(payments.id, booking.paymentId));
      }

      await this.syncBookingAvailability(tx, booking);

      return updated;
    });
  }

  /**
   * CANCEL BOOKING — user-initiated cancellation.
   *
   * Allowed from: PENDING only. Confirmed cancellations require a refund flow.
   * Already CANCELLED / EXPIRED → no-op (idempotent).
   *
   * Side-effect: the linked court slot is re-listed for other users.
   */
  async cancel(bookingId: string, userId: string) {
    return this.db.transaction(async (tx) => {
      const [booking] = await tx
        .select()
        .from(bookings)
        .where(and(eq(bookings.id, bookingId), eq(bookings.userId, userId)))
        .limit(1)
        .for("update");

      if (!booking) throw new NotFoundException("Booking not found");
      // Terminal states → idempotent success, nothing to do
      if (booking.status === "CANCELLED" || booking.status === "EXPIRED") return booking;
      if (booking.status !== "PENDING") {
        throw new BadRequestException("Confirmed bookings cannot be cancelled through this endpoint");
      }

      const [updated] = await tx
        .update(bookings)
        .set({ status: "CANCELLED" as BookingStatus, updatedAt: new Date() })
        .where(eq(bookings.id, bookingId))
        .returning();

      await this.syncBookingAvailability(tx, booking);

      return updated;
    });
  }

  /**
   * EXPIRE PENDING BOOKINGS — runs from the module's periodic expiry timer
   * and is also available to administrators for manual maintenance.
   *
   * Sweeps through all bookings where:
   *   status = 'PENDING' AND expiresAt <= now
   * and bulk-moves them to EXPIRED. Then releases all their courtSlots
   * back to isAvailable=true as a single batched UPDATE ... WHERE id IN(...).
   *
   * Runs inside a transaction so that if the slot-freeing step fails, the
   * bookings don't get stuck EXPIRED with slots still taken.
   *
   * Returns the array of expired booking rows (useful for the cron caller
   * to log / emit cancellation emails).
   */
  async expirePending() {
    const now = new Date();
    return this.db.transaction(async (tx) => {
      // Bulk update: PENDING → EXPIRED where past the deadline
      const expired = await tx
        .update(bookings)
        .set({ status: "EXPIRED" as BookingStatus, updatedAt: new Date() })
        .where(and(eq(bookings.status, "PENDING"), lt(bookings.expiresAt, now)))
        .returning();

      // If any rows were expired, recalculate the backing slot flag.
      if (expired.length > 0) {
        const expiredIds = expired.map((booking) => booking.id);
        const mappedSlots = await tx.select({ courtSlotId: bookingSlots.courtSlotId }).from(bookingSlots).where(inArray(bookingSlots.bookingId, expiredIds));
        const slotIds = [...new Set([...expired.map((booking) => booking.courtSlotId), ...mappedSlots.map((row) => row.courtSlotId)])];
        for (const slotId of slotIds) {
          await this.syncSlotAvailability(tx, slotId);
        }

        const paymentIds = expired
          .map((booking) => booking.paymentId)
          .filter((paymentId): paymentId is string => Boolean(paymentId));
        if (paymentIds.length > 0) {
          await tx
            .update(payments)
            .set({ status: "FAILED" as PaymentStatus, updatedAt: new Date() })
            .where(and(inArray(payments.id, paymentIds), eq(payments.status, "PENDING")));
        }
      }

      return expired;
    });
  }

  private async syncSlotAvailability(tx: any, courtSlotId: string) {
    const [confirmedBooking] = await tx
      .select({ id: bookings.id })
      .from(bookings)
      .leftJoin(bookingSlots, eq(bookingSlots.bookingId, bookings.id))
      .where(and(or(eq(bookings.courtSlotId, courtSlotId), eq(bookingSlots.courtSlotId, courtSlotId)), eq(bookings.status, "CONFIRMED")))
      .limit(1);

    await tx
      .update(courtSlots)
      .set({
        isAvailable: !confirmedBooking,
        updatedAt: new Date(),
      })
      .where(eq(courtSlots.id, courtSlotId));
  }

  private async syncBookingAvailability(tx: any, booking: typeof bookings.$inferSelect) {
    const linked = await tx.select({ courtSlotId: bookingSlots.courtSlotId }).from(bookingSlots).where(eq(bookingSlots.bookingId, booking.id));
    const slotIds = [...new Set([booking.courtSlotId, ...linked.map((row: { courtSlotId: string }) => row.courtSlotId)])];
    for (const slotId of slotIds) await this.syncSlotAvailability(tx, slotId);
  }
}
