import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { AuthGuard } from "@/common/auth.guard";
import { gameCreateSchema, gameRatingCreateSchema, gameSearchSchema } from "@playmate/validation";
import { GamesService } from "./games.service";
import { z } from "zod";

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

  @Get("invites")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async invites(@Req() req: any) {
    return { success: true, data: await this.games.myInvites(req.user.id) };
  }

  @Patch("invites/:inviteId")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async decideInvite(@Req() req: any, @Param("inviteId") inviteId: string, @Body() body: { accept: boolean }) {
    const parsed = z.object({ accept: z.boolean() }).parse(body);
    return { success: true, data: await this.games.decideInvite(inviteId, req.user.id, parsed.accept) };
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Host a public or invite-only game" })
  async create(@Req() req: any, @Body() body: CreateGameDto) {
    return { success: true, data: await this.games.create(req.user.id, gameCreateSchema.parse(body)) };
  }

  @Post(":id/invites")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async invite(@Req() req: any, @Param("id") id: string, @Body() body: { inviteeId: string }) {
    const parsed = z.object({ inviteeId: z.string().uuid() }).parse(body);
    return { success: true, data: await this.games.invite(id, req.user.id, parsed.inviteeId) };
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

  @Get(":id/rating-candidates")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async ratingCandidates(@Req() req: any, @Param("id") id: string) {
    return { success: true, data: await this.games.ratingCandidates(id, req.user.id) };
  }

  @Post(":id/ratings")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async ratePlayer(@Req() req: any, @Param("id") id: string, @Body() body: unknown) {
    const input = gameRatingCreateSchema.parse(body);
    return { success: true, data: await this.games.ratePlayer(id, req.user.id, input) };
  }

  @Patch(":id/attendance/:participantId")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async markAttendance(@Req() req: any, @Param("id") id: string, @Param("participantId") participantId: string, @Body() body: { present: boolean }) {
    const parsed = z.object({ present: z.boolean() }).parse(body);
    return { success: true, data: await this.games.markAttendance(id, participantId, req.user.id, parsed.present) };
  }

  @Patch(":id/complete")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async complete(@Req() req: any, @Param("id") id: string) {
    return { success: true, data: await this.games.complete(id, req.user.id) };
  }

  @Patch(":id/participants/:participantId")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async decide(@Req() req: any, @Param("id") id: string, @Param("participantId") participantId: string, @Body() body: { approve: boolean }) {
    return { success: true, data: await this.games.decide(id, participantId, req.user.id, body.approve) };
  }

  @Post(":id/participants/:participantId/cohost")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async makeCohost(@Req() req: any, @Param("id") id: string, @Param("participantId") participantId: string) {
    return { success: true, data: await this.games.makeCohost(id, participantId, req.user.id) };
  }

  @Post(":id/leave")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async leave(@Req() req: any, @Param("id") id: string) {
    return { success: true, data: await this.games.leave(id, req.user.id) };
  }
}
