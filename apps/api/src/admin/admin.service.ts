import { Injectable } from "@nestjs/common";
import { UsersService } from "@/users/users.service";
import { SportsService } from "@/sports/sports.service";
import { VenuesService } from "@/venues/venues.service";
import { ProductsService } from "@/products/products.service";
import { OrdersService } from "@/orders/orders.service";
import { BookingsService } from "@/bookings/bookings.service";

@Injectable()
export class AdminService {
  constructor(
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

    return {
      users: { total: Array.isArray(users) ? users.length : (users as any).total },
      sports: { total: sports.total },
      venues: { total: venues.total },
    };
  }
}
