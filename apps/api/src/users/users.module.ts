import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { AccountDeletionController } from "./account-deletion.controller";

@Module({
  controllers: [UsersController, AccountDeletionController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
