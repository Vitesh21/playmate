import { Controller, Post, Body, UseGuards, Req, Get, HttpCode } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthGuard } from "@/common/auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signup")
  async signup(@Body() body: { email: string; password: string; firstName?: string; lastName?: string }) {
    const user = await this.authService.signUp(body.email, body.password, {
      firstName: body.firstName,
      lastName: body.lastName,
    });
    return { success: true, data: { user: user.user } };
  }

  @Post("login")
  @HttpCode(200)
  async login(@Body() body: { email: string; password: string }) {
    const data = await this.authService.signIn(body.email, body.password);
    return { success: true, data };
  }

  @Post("logout")
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async logout(@Req() req: any) {
    const token = req.headers["authorization"].slice(7);
    await this.authService.signOut(token);
    return { success: true };
  }

  @Get("me")
  @UseGuards(AuthGuard)
  async me(@Req() req: any) {
    return { success: true, data: { user: req.user } };
  }

  @Post("reset-password")
  @HttpCode(200)
  async resetPassword(@Body() body: { email: string }) {
    await this.authService.resetPassword(body.email);
    return { success: true, message: "Password reset email sent" };
  }
}
