import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { AuthGuard } from "@/common/auth.guard";
import { userUpdateSchema } from "@playmate/validation";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    const data = await this.usersService.findAll();
    return { success: true, data };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const data = await this.usersService.findById(id);
    return { success: true, data };
  }

  @Patch(":id")
  @UseGuards(AuthGuard)
  async update(@Param("id") id: string, @Body() body: unknown) {
    const data = userUpdateSchema.parse(body);
    const user = await this.usersService.update(id, data);
    return { success: true, data: user };
  }

  @Delete(":id")
  @UseGuards(AuthGuard)
  async remove(@Param("id") id: string) {
    await this.usersService.remove(id);
    return { success: true, message: "User deleted" };
  }
}
