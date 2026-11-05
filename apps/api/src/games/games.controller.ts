import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { AuthGuard } from "@/common/auth.guard";
import { gameCreateSchema, gameSearchSchema } from "@playmate/validation";
import { GamesService } from "./games.service";

class CreateGameDto extends createZodDto(gameCreateSchema) {}
class SearchGamesDto extends createZodDto(gameSearchSchema) {}

@ApiTags("Games")
@Controller("games")
export class GamesController {
  constructor(private readonly games: GamesService) {}

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Find public games" })
  async search(@Query() query: SearchGamesDto, @Req() req: any) {
    return { success: true, data: await this.games.search(gameSearchSchema.parse(query), req.user.id) };
  }

  @Get("mine")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async mine(@Req() req: any) {
    return { success: true, data: await this.games.mine(req.user.id) };
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Host a public or invite-only game" })
  async create(@Req() req: any, @Body() body: CreateGameDto) {
    return { success: true, data: await this.games.create(req.user.id, gameCreateSchema.parse(body)) };
  }

  @Post(":id/join")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async join(@Req() req: any, @Param("id") id: string, @Body() body: { message?: string }) {
    return { success: true, data: await this.games.join(id, req.user.id, body.message) };
  }

  @Get(":id/participants")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async participants(@Req() req: any, @Param("id") id: string) {
    return { success: true, data: await this.games.participants(id, req.user.id) };
  }

  @Patch(":id/participants/:participantId")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async decide(@Req() req: any, @Param("id") id: string, @Param("participantId") participantId: string, @Body() body: { approve: boolean }) {
    return { success: true, data: await this.games.decide(id, participantId, req.user.id, body.approve) };
  }

  @Post(":id/leave")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async leave(@Req() req: any, @Param("id") id: string) {
    return { success: true, data: await this.games.leave(id, req.user.id) };
  }
}
