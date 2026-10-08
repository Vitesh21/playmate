import { Module } from "@nestjs/common";
import { VenueEssentialsController } from "./venue-essentials.controller";
import { VenueEssentialsService } from "./venue-essentials.service";

@Module({
  controllers: [VenueEssentialsController],
  providers: [VenueEssentialsService],
  exports: [VenueEssentialsService],
})
export class VenueEssentialsModule {}
