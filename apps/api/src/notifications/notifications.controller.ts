import { Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";
import { AuthGuard } from "@/common/auth.guard";

@ApiTags("Notifications")
@ApiBearerAuth()
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "List notifications for current user" })
  async findAll(@Req() req: any) {
    const params = { page: 1, perPage: 20 };
    const data = await this.notificationsService.findByUser(req.user.id, params);
    return { success: true, data };
  }

  @Get("unread-count")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Get unread notification count" })
  async unreadCount(@Req() req: any) {
    const count = await this.notificationsService.unreadCount(req.user.id);
    return { success: true, data: { count } };
  }

  @Post(":id/read")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Mark a notification as read" })
  @ApiParam({ name: "id", description: "Notification UUID" })
  async markAsRead(@Req() req: any, @Param("id") id: string) {
    const data = await this.notificationsService.markAsRead(req.user.id, id);
    return { success: true, data };
  }

  @Post("read-all")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Mark all notifications as read" })
  async markAllAsRead(@Req() req: any) {
    await this.notificationsService.markAllAsRead(req.user.id);
    return { success: true, message: "All notifications marked as read" };
  }
}

