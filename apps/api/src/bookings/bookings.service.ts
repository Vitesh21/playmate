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
        .select()
        .from(bookings)
        .where(eq(bookings.userId, userId))
        .orderBy(desc(bookings.createdAt))
        .limit(perPage)
        .offset(offset),
      // Parallel COUNT(*) for pagination totals
      this.db.select({ value: sql<number>`count(*)` }).from(bookings).where(eq(bookings.userId, userId)),
    ]);
    const total = Number(totalObj?.value ?? 0);
    return { items, total, page, perPage, totalPages: Math.ceil(total / perPage) };
  }

  /**
   * Fetch a single booking by primary key. Throws 404 if missing.
   * No row lock — safe for read-only display endpoints.
   */
  async findById(id: string) {
    const [item] = await this.db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
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
      // Step 1: atomically claim the slot (or fail fast)
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

      // No row returned → either slot never existed, was already taken, or
      // is currently being reserved by a concurrent tx. Same user-facing error.
      if (!slot) {
        throw new ConflictException("Slot is no longer available");
      }

      // Step 2: compute the PENDING window. If the user doesn't complete
      // payment within this many minutes, the booking is auto-expired and
      // the slot is freed (see expirePending() + the cron that calls it).
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + config.booking.pendingExpiryMinutes);

      // Step 3: insert the PENDING booking row
      const [booking] = await tx
        .insert(bookings)
        .values({
          userId,
          courtSlotId: input.courtSlotId,
          status: "PENDING" as BookingStatus,
          totalAmount: slot.price, // Price comes from the slot row, not user input — never trust the client on pricing!
          expiresAt,
        } satisfies NewBooking)
        .returning();

      if (!booking) throw new Error("Failed to create booking");

      // Step 4: FLIP THE SLOT — mark it NOT available so other users
      // can't even see it as bookable anymore. Runs inside the same tx,
      // so a rollback here restores isAvailable=true.
      await tx.update(courtSlots).set({ isAvailable: false }).where(eq(courtSlots.id, input.courtSlotId));

      // Step 5: create Razorpay Order (payment intent).
      // Receipt format: "<prefix>_BKG_<shortBookingId>"
      // NOTE: ×100 because Razorpay takes PAISA (not whole INR rupees).
      const receipt = `${config.payments.receiptPrefix}_BKG_${booking.id.slice(0, 8)}`;
      const rzpOrder = await this.razorpay.createOrder(slot.price * 100, receipt);

      // Step 6: write our local payments record, linked to the booking
      const [payment] = await tx
        .insert(payments)
        .values({
          userId,
          amount: slot.price,
          method: "RAZORPAY",
          status: "PENDING" as PaymentStatus,
          transactionId: rzpOrder.id, // store Razorpay's order_XXX id for later webhook matching
          bookingId: booking.id,
        } satisfies NewPayment)
        .returning();

      // Step 7: backfill booking.paymentId (we needed booking.id to create
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

      return updated;
    });
  }

  /**
   * CANCEL BOOKING — user-initiated cancellation.
   *
   * Allowed from: PENDING or CONFIRMED.
   * Already CANCELLED / EXPIRED → no-op (idempotent).
   *
   * Side-effect: the linked courtSlot.isAvailable is set back to true so
   * the slot is re-listed for other users. (Note: if called on a CONFIRMED
   * booking, this returns the slot to availability — refunds on the payment
   * side are handled separately.)
   */
  async cancel(bookingId: string) {
    return this.db.transaction(async (tx) => {
      const [booking] = await tx
        .select()
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1)
        .for("update");

      if (!booking) throw new NotFoundException("Booking not found");
      // Terminal states → idempotent success, nothing to do
      if (booking.status === "CANCELLED" || booking.status === "EXPIRED") return booking;

      const [updated] = await tx
        .update(bookings)
        .set({ status: "CANCELLED" as BookingStatus, updatedAt: new Date() })
        .where(eq(bookings.id, bookingId))
        .returning();

      // Restore the slot to available so someone else can book it
      await tx
        .update(courtSlots)
        .set({ isAvailable: true })
        .where(eq(courtSlots.id, booking.courtSlotId));

      return updated;
    });
  }

  /**
   * EXPIRE PENDING BOOKINGS — cron job entry point (scheduled elsewhere,
   * e.g. every 1 or 5 minutes).
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
        .where(and(eq(bookings.status, "PENDING"), sql`${bookings.expiresAt} <= ${now}`))
        .returning();

      // If any rows were expired, free their slots in one query
      if (expired.length > 0) {
        const slotIds = expired.map((b) => b.courtSlotId);
        await tx.update(courtSlots).set({ isAvailable: true }).where(inArray(courtSlots.id, slotIds));
      }

      return expired;
    });
  }
}
