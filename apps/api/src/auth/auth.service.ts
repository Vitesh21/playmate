import { Injectable } from "@nestjs/common";
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
    if (error) throw error;
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.admin.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async signOut(accessToken: string) {
    const { error } = await this.supabase.admin.auth.admin.signOut(accessToken);
    if (error) throw error;
    return true;
  }

  async getUser(accessToken: string) {
    const { data, error } = await this.supabase.admin.auth.getUser(accessToken);
    if (error) throw error;
    return data;
  }

  async resetPassword(email: string) {
    const { data, error } = await this.supabase.admin.auth.resetPasswordForEmail(email);
    if (error) throw error;
    return data;
  }
}
