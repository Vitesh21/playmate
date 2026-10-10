import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { UsersService } from "./users.service";
import { AuthGuard } from "@/common/auth.guard";
import { userUpdateSchema } from "@playmate/validation";

export class UpdateUserDto extends createZodDto(userUpdateSchema) {}

@ApiTags("Users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: "List all users" })
  async findAll() {
    const data = await this.usersService.findAll();
    return { success: true, data };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get user by ID" })
  @ApiParam({ name: "id", description: "User UUID" })
  async findOne(@Param("id") id: string) {
    const data = await this.usersService.findById(id);
    return { success: true, data };
  }

  @Patch(":id")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update user profile" })
  @ApiParam({ name: "id", description: "User UUID" })
  async update(@Param("id") id: string, @Body() body: UpdateUserDto) {
    const data = userUpdateSchema.parse(body);
    const user = await this.usersService.update(id, data);
    return { success: true, data: user };
  }

  @Delete(":id")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete user account" })
  @ApiParam({ name: "id", description: "User UUID" })
  async remove(@Param("id") id: string) {
    await this.usersService.remove(id);
    return { success: true, message: "User deleted" };
  }
}

