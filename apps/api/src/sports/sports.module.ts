import { Module } from "@nestjs/common";
import { SportsController } from "./sports.controller";
import { SportsService } from "./sports.service";

@Module({
  controllers: [SportsController],
  providers: [SportsService],
  exports: [SportsService],
})
export class SportsModule {}
