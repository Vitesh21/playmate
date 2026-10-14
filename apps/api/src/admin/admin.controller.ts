import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { AuthGuard, RolesGuard } from "@/common/auth.guard";
import { UserRole } from "@playmate/types";

@ApiTags("Admin")
@ApiBearerAuth()
@Controller("admin")
@UseGuards(AuthGuard, new RolesGuard([UserRole.ADMIN]))
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("stats")
  @ApiOperation({ summary: "Get system administrator dashboard stats" })
  async getStats() {
    const data = await this.adminService.getDashboardStats();
    return { success: true, data };
  }

  @Get("users")
  @ApiOperation({ summary: "List every user (ADMIN only)" })
  async getUsers() {
    const data = await this.adminService.getAllUsers();
    return { success: true, data };
  }

  @Get("venues")
  @ApiOperation({ summary: "List every venue (ADMIN only)" })
  async getVenues() {
    const data = await this.adminService.getAllVenues();
    return { success: true, data };
  }
}
