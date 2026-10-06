import { Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { AuthGuard } from "@/common/auth.guard";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(AuthGuard)
  async findAll(@Req() req: any) {
    const params = { page: 1, perPage: 20 };
    const data = await this.notificationsService.findByUser(req.user.id, params);
    return { success: true, data };
  }

  @Get("unread-count")
  @UseGuards(AuthGuard)
  async unreadCount(@Req() req: any) {
    const count = await this.notificationsService.unreadCount(req.user.id);
    return { success: true, data: { count } };
  }

  @Post(":id/read")
  @UseGuards(AuthGuard)
  async markAsRead(@Req() req: any, @Param("id") id: string) {
    const data = await this.notificationsService.markAsRead(req.user.id, id);
    return { success: true, data };
  }

  @Post("read-all")
  @UseGuards(AuthGuard)
  async markAllAsRead(@Req() req: any) {
    await this.notificationsService.markAllAsRead(req.user.id);
    return { success: true, message: "All notifications marked as read" };
  }
}
