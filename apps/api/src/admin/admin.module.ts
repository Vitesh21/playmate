import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { UsersModule } from "@/users/users.module";
import { SportsModule } from "@/sports/sports.module";
import { VenuesModule } from "@/venues/venues.module";
import { ProductsModule } from "@/products/products.module";
import { OrdersModule } from "@/orders/orders.module";
import { BookingsModule } from "@/bookings/bookings.module";

@Module({
  imports: [UsersModule, SportsModule, VenuesModule, ProductsModule, OrdersModule, BookingsModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
