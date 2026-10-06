import { Controller, Get, UseGuards } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { AuthGuard } from "@/common/auth.guard";

@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("stats")
  @UseGuards(AuthGuard)
  async getStats() {
    const data = await this.adminService.getDashboardStats();
    return { success: true, data };
  }
}
