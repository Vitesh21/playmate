import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { AuthGuard } from "@/common/auth.guard";
import { UsersService } from "./users.service";

class FriendRequestDto extends createZodDto(z.object({ email: z.string().email() })) {}
class FriendDecisionDto extends createZodDto(z.object({ accept: z.boolean() })) {}

@ApiTags("Playpals")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("friends")
export class FriendsController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: "List accepted playpals" })
  async list(@Req() req: any) {
    return { success: true, data: await this.users.friends(req.user.id) };
  }

  @Get("requests")
  @ApiOperation({ summary: "List incoming and outgoing playpal requests" })
  async requests(@Req() req: any) {
    return { success: true, data: await this.users.friendRequests(req.user.id) };
  }

  @Post("requests")
  @ApiOperation({ summary: "Send a playpal request by email" })
  async create(@Req() req: any, @Body() body: FriendRequestDto) {
    return { success: true, data: await this.users.requestFriend(req.user.id, body.email) };
  }

  @Patch("requests/:id")
  @ApiOperation({ summary: "Accept or decline a playpal request" })
  async respond(@Req() req: any, @Param("id") id: string, @Body() body: FriendDecisionDto) {
    return { success: true, data: await this.users.respondFriendRequest(req.user.id, id, body.accept) };
  }

  @Delete(":id")
  @ApiOperation({ summary: "Remove a playpal" })
  async remove(@Req() req: any, @Param("id") id: string) {
    await this.users.removeFriend(req.user.id, id);
    return { success: true };
  }
}
