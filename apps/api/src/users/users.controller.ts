import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { UsersService } from "./users.service";
import { userUpdateSchema } from "@playmate/validation";
import { UserRole } from "@playmate/types";
import { AuthGuard, RolesGuard } from "@/common/auth.guard";
import { z } from "zod";

const playerProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  avatarUrl: z.string().url().max(500).optional(),
  bio: z.string().trim().max(500).optional(),
  preferredSports: z.array(z.string().uuid()).max(20).optional(),
  skillLevels: z.record(z.string().uuid(), z.enum(["BEGINNER", "RECREATIONAL", "INTERMEDIATE", "ADVANCED", "COMPETITIVE"])).optional(),
  preferredTimes: z.array(z.enum(["MORNING", "AFTERNOON", "EVENING", "NIGHT"])).max(4).optional(),
  homeLocation: z.object({ area: z.string().trim().max(100), city: z.string().trim().max(100) }).optional(),
  privacy: z.object({ profileVisibility: z.enum(["PUBLIC", "PLAYPALS", "PRIVATE"]).optional(), showGames: z.boolean().optional(), showCalendar: z.boolean().optional(), showHomeArea: z.boolean().optional() }).optional(),
});

export class UpdateUserDto extends createZodDto(userUpdateSchema) {}

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

  @Get("me/profile")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the current player's extended profile" })
  async myProfile(@Req() req: any) {
    return { success: true, data: await this.usersService.getMyProfile(req.user.id) };
  }

  @Patch("me/profile")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update sports profile and privacy preferences" })
  async updateMyProfile(@Req() req: any, @Body() body: unknown) {
    const patch = playerProfileSchema.parse(body);
    return { success: true, data: await this.usersService.updateMyProfile(req.user.id, patch) };
  }

  @Get(":id/public-profile")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get a player's privacy-filtered public profile" })
  async publicProfile(@Param("id") id: string) {
    return { success: true, data: await this.usersService.publicProfile(id) };
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

