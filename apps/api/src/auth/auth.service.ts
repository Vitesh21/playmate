import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from "@nestjs/common";
import { SupabaseService } from "@/common/supabase.service";

@Injectable()
export class AuthService {
  constructor(private readonly supabase: SupabaseService) {}

  async signUp(email: string, password: string, metadata?: Record<string, unknown>) {
    const { data, error } = await this.supabase.admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) {
      const msg = error.message ?? "";
      // Supabase returns a generic message for an existing account; surface 409.
      if (/already|registered|exists|duplicate/i.test(msg)) {
        throw new ConflictException("An account with this email already exists. Try signing in instead.");
      }
      throw new BadRequestException(msg || "Could not create account.");
    }
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.admin.auth.signInWithPassword({ email, password });
    if (error) {
      throw new UnauthorizedException("Invalid email or password.");
    }
    return data;
  }

  async signOut(accessToken: string) {
    const { error } = await this.supabase.admin.auth.admin.signOut(accessToken);
    if (error) {
      throw new UnauthorizedException(error.message || "Could not sign out.");
    }
    return true;
  }

  async getUser(accessToken: string) {
    const { data, error } = await this.supabase.admin.auth.getUser(accessToken);
    if (error) {
      throw new UnauthorizedException(error.message || "Invalid or expired token.");
    }
    return data;
  }

  async resetPassword(email: string) {
    const { data, error } = await this.supabase.admin.auth.resetPasswordForEmail(email);
    if (error) {
      throw new BadRequestException(error.message || "Could not send reset email.");
    }
    return data;
  }
}
