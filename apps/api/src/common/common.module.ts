import { Global, Module } from "@nestjs/common";
import { SupabaseService } from "./supabase.service";
import { RazorpayService } from "./razorpay.service";
import { EmailService } from "./email.service";
import { AuthGuard, RolesGuard } from "./auth.guard";

@Global()
@Module({
  providers: [SupabaseService, RazorpayService, EmailService, AuthGuard, RolesGuard],
  exports: [SupabaseService, RazorpayService, EmailService, AuthGuard, RolesGuard],
})
export class CommonModule {}
