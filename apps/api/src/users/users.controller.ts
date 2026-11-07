import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { UsersService } from "./users.service";
import { userUpdateSchema } from "@playmate/validation";
import { UserRole } from "@playmate/types";
import { AuthGuard, RolesGuard } from "@/common/auth.guard";

export class UpdateUserDto extends createZodDto(userUpdateSchema) {}
const playerProfileSchema = z.object({
  bio: z.string().max(500).nullable().optional(),
  homeCity: z.string().max(80).nullable().optional(),
  homeState: z.string().max(80).nullable().optional(),
  preferredSports: z.array(z.string().uuid()).max(30).optional(),
  skillLevels: z.record(z.string().uuid(), z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "PRO"])).optional(),
  preferredTimes: z.array(z.string().min(1).max(40)).max(20).optional(),
  profileVisibility: z.enum(["PUBLIC", "FRIENDS", "PRIVATE"]).optional(),
  gamesVisibility: z.enum(["PUBLIC", "FRIENDS", "PRIVATE"]).optional(),
  calendarVisibility: z.enum(["PUBLIC", "FRIENDS", "PRIVATE"]).optional(),
}).strict();
export class UpdatePlayerProfileDto extends createZodDto(playerProfileSchema) {}

@ApiTags("Users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(AuthGuard, new RolesGuard([UserRole.ADMIN]))
  @ApiBearerAuth()
  @ApiOperation({ summary: "List all users" })
  async findAll() {
    const data = await this.usersService.findAll();
    return { success: true, data };
  }

  @Get("me/player-profile")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async getMyPlayerProfile(@Req() req: any) {
    return { success: true, data: await this.usersService.getPlayerProfile(req.user.id) };
  }

  @Patch("me/player-profile")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async updateMyPlayerProfile(@Req() req: any, @Body() body: UpdatePlayerProfileDto) {
    const input = playerProfileSchema.parse(body);
    return { success: true, data: await this.usersService.updatePlayerProfile(req.user.id, input) };
  }

  @Get(":id/public-profile")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async getPublicProfile(@Req() req: any, @Param("id") id: string) {
    return { success: true, data: await this.usersService.getPublicPlayerProfile(req.user.id, id) };
  }

  @Get(":id")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user by ID" })
  @ApiParam({ name: "id", description: "User UUID" })
  async findOne(@Req() req: any, @Param("id") id: string) {
    if (req.user.id !== id && req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("You can only view your own profile");
    }
    const data = await this.usersService.findById(id);
    return { success: true, data };
  }

  @Patch("me")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update user profile" })
  async update(@Req() req: any, @Body() body: UpdateUserDto) {
    const data = userUpdateSchema.parse(body);
    const user = await this.usersService.update(req.user.id, data);
    return { success: true, data: user };
  }

  @Post(":id/block")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Block a player" })
  async block(@Req() req: any, @Param("id") id: string) {
    return { success: true, data: await this.usersService.block(req.user.id, id) };
  }

  @Delete(":id/block")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Unblock a player" })
  async unblock(@Req() req: any, @Param("id") id: string) {
    await this.usersService.unblock(req.user.id, id);
    return { success: true };
  }

  @Delete("me")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete user account" })
  async remove(@Req() req: any) {
    await this.usersService.remove(req.user.id);
    return { success: true, message: "User deleted" };
  }
}
