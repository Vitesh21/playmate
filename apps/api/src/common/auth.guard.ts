/**
 * Authentication & Authorization Guards
 *
 * AuthGuard — Validates an incoming Bearer token via Supabase Auth, then
 *             resolves the corresponding application user (role + profile)
 *             from the local `users` table and attaches it to `request.user`.
 * RolesGuard — Role-based access control (RBAC). Requires one or more
 *              UserRole values and rejects users whose role is not allowed.
 *
 * Role authority: Supabase `app_metadata.role` (server-controlled, cannot be
 * edited by the end user) with the local `users.role` column as a fallback and
 * `USER` as the final default. The local user row is upserted on the fly so
 * foreign keys (bookings, venues, orders) always resolve.
 */

import {
  Injectable,
  Inject,
  type CanActivate,
  type ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { eq } from "drizzle-orm";
import { SupabaseService } from "@/common/supabase.service";
import { DRIZZLE_DB, type DrizzleDb } from "@/db/database.module";
import { users } from "@/db/schema/users";
import { UserRole } from "@playmate/types";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly supabase: SupabaseService,
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDb,
  ) {}

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

    const supa = data.user;
    const meta = (supa.user_metadata ?? {}) as Record<string, any>;
    const appMeta = (supa.app_metadata ?? {}) as Record<string, any>;
    const tokenRole = appMeta.role as UserRole | undefined;

    // Ensure a local profile row exists (needed for FK writes) and read its role.
    let [row] = await this.db.select().from(users).where(eq(users.id, supa.id)).limit(1);
    if (!row) {
      const inserted = await this.db
        .insert(users)
        .values({
          id: supa.id,
          email: supa.email ?? null,
          firstName: meta.firstName ?? null,
          lastName: meta.lastName ?? null,
          role: (tokenRole ?? UserRole.USER) as any,
        })
        .onConflictDoNothing()
        .returning();
      row = inserted[0];
    }

    const role: UserRole = tokenRole ?? (row?.role as UserRole) ?? UserRole.USER;

    request.user = {
      id: supa.id,
      email: supa.email ?? row?.email ?? null,
      firstName: row?.firstName ?? meta.firstName ?? null,
      lastName: row?.lastName ?? meta.lastName ?? null,
      phone: row?.phone ?? null,
      avatarUrl: row?.avatarUrl ?? null,
      role,
      supabase: supa,
    };

    return true;
  }
}

/**
 * RolesGuard — RBAC check against the resolved user's `role`.
 *
 * Instantiated with the list of roles allowed to access the route, e.g.
 * `new RolesGuard([UserRole.ADMIN])`. Must run AFTER AuthGuard.
 */
export class RolesGuard implements CanActivate {
  constructor(private readonly requiredRoles: UserRole[]) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const role = request.user?.role as UserRole | undefined;

    if (!role || !this.requiredRoles.includes(role)) {
      throw new UnauthorizedException("Insufficient permissions");
    }

    return true;
  }
}
