import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { AuthGuard } from "@/common/auth.guard";

@ApiTags("Admin")
@ApiBearerAuth()
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("stats")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Get system administrator dashboard stats" })
  async getStats() {
    const data = await this.adminService.getDashboardStats();
    return { success: true, data };
  }
}

