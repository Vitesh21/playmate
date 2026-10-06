import { Injectable, Inject, type CanActivate, type ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { SupabaseService } from "@/common/supabase.service";
import type { UserRole } from "@playmate/types";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers["authorization"];

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing authorization token");
    }

    const token = authHeader.slice(7);
    const { data, error } = await this.supabase.admin.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException("Invalid or expired token");
    }

    request.user = data.user;
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly requiredRoles: UserRole[]) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const role = user?.role as UserRole;

    if (!role || !this.requiredRoles.includes(role)) {
      throw new UnauthorizedException("Insufficient permissions");
    }

    return true;
  }
}
