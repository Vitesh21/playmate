import { Module } from "@nestjs/common";
import { GamesController } from "./games.controller";
import { GamesService } from "./games.service";
import { UsersModule } from "@/users/users.module";

@Module({ imports: [UsersModule], controllers: [GamesController], providers: [GamesService], exports: [GamesService] })
export class GamesModule {}
