import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { AuthGuard } from "@/common/auth.guard";
import { UsersService } from "./users.service";

class CreateGroupDto extends createZodDto(z.object({ name: z.string().trim().min(3).max(80), rules: z.string().max(1000).optional(), photoUrl: z.string().url().optional() })) {}
class AddMemberDto extends createZodDto(z.object({ userId: z.string().uuid() })) {}
class GroupMessageDto extends createZodDto(z.object({ body: z.string().trim().min(1).max(2000) })) {}

@ApiTags("Groups")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("groups")
export class GroupsController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: "List groups the current player belongs to" })
  async list(@Req() req: any) {
    return { success: true, data: await this.users.listGroups(req.user.id) };
  }

  @Post()
  @ApiOperation({ summary: "Create a group and become its admin" })
  async create(@Req() req: any, @Body() body: CreateGroupDto) {
    return { success: true, data: await this.users.createGroup(req.user.id, body) };
  }

  @Post(":id/members")
  @ApiOperation({ summary: "Add an accepted playpal to a group" })
  async addMember(@Req() req: any, @Param("id") id: string, @Body() body: AddMemberDto) {
    return { success: true, data: await this.users.addGroupMember(req.user.id, id, body.userId) };
  }

  @Get(":id/messages")
  @ApiOperation({ summary: "Read group chat history" })
  async messages(@Req() req: any, @Param("id") id: string) {
    return { success: true, data: await this.users.groupMessagesFor(req.user.id, id) };
  }

  @Post(":id/messages")
  @ApiOperation({ summary: "Send a group chat message" })
  async send(@Req() req: any, @Param("id") id: string, @Body() body: GroupMessageDto) {
    return { success: true, data: await this.users.sendGroupMessage(req.user.id, id, body.body) };
  }

  @Delete(":id/members/me")
  @ApiOperation({ summary: "Leave a group" })
  async leave(@Req() req: any, @Param("id") id: string) {
    await this.users.leaveGroup(req.user.id, id);
    return { success: true };
  }
}
