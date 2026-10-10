import { Controller, Post, Body, UseGuards, Req, Get, HttpCode } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { AuthService } from "./auth.service";
import { AuthGuard } from "@/common/auth.guard";

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});
export class SignupDto extends createZodDto(signupSchema) {}

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export class LoginDto extends createZodDto(loginSchema) {}

export const resetPasswordSchema = z.object({
  email: z.string().email(),
});
export class ResetPasswordDto extends createZodDto(resetPasswordSchema) {}

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signup")
  @ApiOperation({ summary: "Register a new user" })
  async signup(@Body() body: SignupDto) {
    const data = signupSchema.parse(body);
    const user = await this.authService.signUp(data.email, data.password, {
      firstName: data.firstName,
      lastName: data.lastName,
    });
    return { success: true, data: { user: user.user } };
  }

  @Post("login")
  @HttpCode(200)
  @ApiOperation({ summary: "Sign in with email and password" })
  async login(@Body() body: LoginDto) {
    const data = loginSchema.parse(body);
    const res = await this.authService.signIn(data.email, data.password);
    return { success: true, data: res };
  }

  @Post("logout")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: "Log out current user session" })
  async logout(@Req() req: any) {
    const token = req.headers["authorization"].slice(7);
    await this.authService.signOut(token);
    return { success: true };
  }

  @Get("me")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current authenticated user profile" })
  async me(@Req() req: any) {
    return { success: true, data: { user: req.user } };
  }

  @Post("reset-password")
  @HttpCode(200)
  @ApiOperation({ summary: "Send password reset email" })
  async resetPassword(@Body() body: ResetPasswordDto) {
    const data = resetPasswordSchema.parse(body);
    await this.authService.resetPassword(data.email);
    return { success: true, message: "Password reset email sent" };
  }
}

