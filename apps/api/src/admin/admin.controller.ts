import { BadRequestException, Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
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

  @Get("venues/pending")
  @ApiOperation({ summary: "List venues waiting for verification" })
  async getPendingVenues() {
    return { success: true, data: await this.adminService.getPendingVenues() };
  }

  @Patch("venues/:id/verification")
  @ApiOperation({ summary: "Approve or reject a venue listing" })
  async verifyVenue(@Param("id") id: string, @Body() body: { status: "APPROVED" | "REJECTED" }) {
    if (body.status !== "APPROVED" && body.status !== "REJECTED") throw new BadRequestException("Status must be APPROVED or REJECTED");
    return { success: true, data: await this.adminService.verifyVenue(id, body.status) };
  }
}
