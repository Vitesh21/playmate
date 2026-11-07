import { Inject, Injectable } from "@nestjs/common";
import { and, count, eq, gt, gte, inArray, sql } from "drizzle-orm";
import { DRIZZLE_DB, type DrizzleDb } from "@/db/database.module";
import { payments } from "@/db/schema/payments";
import { bookings, bookingSlots } from "@/db/schema/bookings";
import { courtSlots } from "@/db/schema/court-slots";
import { games, gameParticipants } from "@/db/schema/games";
import { UsersService } from "@/users/users.service";
import { SportsService } from "@/sports/sports.service";
import { VenuesService } from "@/venues/venues.service";
import { ProductsService } from "@/products/products.service";
import { OrdersService } from "@/orders/orders.service";
import { BookingsService } from "@/bookings/bookings.service";

@Injectable()
export class AdminService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDb,
    private readonly usersService: UsersService,
    private readonly sportsService: SportsService,
    private readonly venuesService: VenuesService,
    private readonly productsService: ProductsService,
    private readonly ordersService: OrdersService,
    private readonly bookingsService: BookingsService,
  ) {}

  async getDashboardStats() {
    const [users, sports, venues] = await Promise.all([
      this.usersService.findAll(),
      this.sportsService.findAll({ page: 1, perPage: 100 }),
      this.venuesService.search({ page: 1, perPage: 100 }),
    ]);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const [revenue, paidBookingRows, paidShopRows, recentPayments, recentHostedGames, recentParticipations, repeatCustomers, futureAvailableSlots, futureConfirmedSlots, futurePendingHolds, bookingTotals] = await Promise.all([
      this.db.select({ gross: sql<number>`coalesce(sum(${payments.amount}), 0)`, refunds: sql<number>`coalesce(sum(coalesce((${payments.gatewayResponse}->>'cancellationRefundAmount')::integer, 0)), 0)` })
        .from(payments).where(inArray(payments.status, ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"])),
      this.db.select({ amount: sql<number>`coalesce(sum(${payments.amount}), 0)`, refunds: sql<number>`coalesce(sum(coalesce((${payments.gatewayResponse}->>'cancellationRefundAmount')::integer, 0)), 0)` })
        .from(payments).where(and(inArray(payments.status, ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"]), sql`${payments.bookingId} is not null`)),
      this.db.select({ amount: sql<number>`coalesce(sum(${payments.amount}), 0)`, refunds: sql<number>`coalesce(sum(coalesce((${payments.gatewayResponse}->>'cancellationRefundAmount')::integer, 0)), 0)` })
        .from(payments).where(and(inArray(payments.status, ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"]), sql`${payments.orderId} is not null`)),
      this.db.select({ userId: payments.userId }).from(payments).where(and(eq(payments.status, "PAID"), gte(payments.createdAt, thirtyDaysAgo))),
      this.db.select({ userId: games.hostId }).from(games).where(gte(games.updatedAt, thirtyDaysAgo)),
      this.db.select({ userId: gameParticipants.userId }).from(gameParticipants).innerJoin(games, eq(games.id, gameParticipants.gameId)).where(gte(gameParticipants.updatedAt, thirtyDaysAgo)),
      this.db.select({ value: count() }).from(sql`(select ${payments.userId} from ${payments} where ${payments.status} in ('PAID', 'PARTIALLY_REFUNDED', 'REFUNDED') group by ${payments.userId} having count(*) > 1) as repeat_customers`),
      this.db.select({ value: count() }).from(courtSlots).where(and(eq(courtSlots.isAvailable, true), gte(courtSlots.date, today))),
      this.db.select({ value: count() }).from(bookingSlots).innerJoin(bookings, eq(bookings.id, bookingSlots.bookingId)).innerJoin(courtSlots, eq(courtSlots.id, bookingSlots.courtSlotId)).where(and(eq(bookings.status, "CONFIRMED"), gte(courtSlots.date, today))),
      this.db.select({ value: count() }).from(bookingSlots).innerJoin(bookings, eq(bookings.id, bookingSlots.bookingId)).innerJoin(courtSlots, eq(courtSlots.id, bookingSlots.courtSlotId)).where(and(eq(bookings.status, "PENDING"), gt(bookings.expiresAt, new Date()), gte(courtSlots.date, today))),
      this.db.select({ value: count() }).from(bookings),
    ]);

    const activeUsers30d = new Set([...recentPayments, ...recentHostedGames, ...recentParticipations].map(({ userId }) => userId)).size;
    const confirmedSlots = Number(futureConfirmedSlots[0]?.value ?? 0);
    const availableSlots = Math.max(0, Number(futureAvailableSlots[0]?.value ?? 0) - Number(futurePendingHolds[0]?.value ?? 0));
    const gmv = Number(revenue[0]?.gross ?? 0);
    const refunds = Number(revenue[0]?.refunds ?? 0);
    return {
      users: { total: Array.isArray(users) ? users.length : (users as any).total },
      sports: { total: sports.total },
      venues: { total: venues.total },
      activeUsers30d,
      bookings: { total: Number(bookingTotals[0]?.value ?? 0), confirmedSlots },
      revenue: {
        gmv,
        refunds,
        net: Math.max(0, gmv - refunds),
        bookingGmv: Number(paidBookingRows[0]?.amount ?? 0),
        bookingNet: Math.max(0, Number(paidBookingRows[0]?.amount ?? 0) - Number(paidBookingRows[0]?.refunds ?? 0)),
        shopGmv: Number(paidShopRows[0]?.amount ?? 0),
        shopNet: Math.max(0, Number(paidShopRows[0]?.amount ?? 0) - Number(paidShopRows[0]?.refunds ?? 0)),
      },
      occupancy: { availableSlots, confirmedSlots, fillRatePercent: availableSlots + confirmedSlots ? Math.round(confirmedSlots * 1000 / (availableSlots + confirmedSlots)) / 10 : 0 },
      repeatCustomers: Number(repeatCustomers[0]?.value ?? 0),
    };
  }

  async getAllUsers() {
    return this.usersService.findAll();
  }

  async getAllVenues() {
    return this.venuesService.search({ page: 1, perPage: 100 });
  }

  async getPendingVenues() {
    return this.venuesService.pendingVerification();
  }

  async verifyVenue(id: string, status: "APPROVED" | "REJECTED") {
    return this.venuesService.setVerification(id, status);
  }
}
