import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { BookingsModule } from "@/bookings/bookings.module";
import { OrdersModule } from "@/orders/orders.module";

@Module({
  imports: [BookingsModule, OrdersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
