/**
 * Authentication & Authorization Guards
 *
 * This module provides two NestJS CanActivate guards:
 *  1. AuthGuard  — Bearer-token verification using Supabase Auth admin client.
 *                  Attaches the resolved Supabase user object to request.user.
 *  2. RolesGuard — Role-based access control (RBAC). Requires one or more
 *                  UserRole values and rejects users whose role is not in
 *                  the allowed set.
 *
 * Typical usage on a controller route:
 *   @UseGuards(AuthGuard, new RolesGuard(['ADMIN', 'VENDOR']))
 *
 * The AuthGuard MUST run before RolesGuard because RolesGuard reads
 * request.user which AuthGuard sets.
 */

import { Injectable, Inject, type CanActivate, type ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { SupabaseService } from "@/common/supabase.service";
import type { UserRole } from "@playmate/types";

/**
 * AuthGuard — Validates an incoming Bearer token via Supabase Auth.
 *
 * Flow:
 *  1. Extract the HTTP request from the Nest execution context.
 *  2. Read the `Authorization` header. Must be "Bearer <jwt>".
 *  3. Strip the "Bearer " prefix to isolate the raw JWT.
 *  4. Call supabase.admin.auth.getUser(token) — this uses the SERVICE ROLE
 *     key so it bypasses RLS and validates the token against Supabase directly.
 *  5. If validation fails OR no user is returned → 401 Unauthorized.
 *  6. Otherwise, attach the user object to `request.user` so downstream
 *     guards / resolvers / controllers can read it (e.g. RolesGuard).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Nest abstracts HTTP/WebSocket/GraphQL contexts; we want plain HTTP here.
    const request = context.switchToHttp().getRequest();
    // Authorization header format: "Bearer eyJhbG..."
    const authHeader = request.headers["authorization"];

    // Early fail: header missing or wrong scheme → 401
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing authorization token");
    }

    // "Bearer ".length === 7 → slice(7) gives the token body
    const token = authHeader.slice(7);
    // Use the Supabase ADMIN client (service-role key) to verify the JWT.
    // This works for all tokens (including refresh-derived ones) and does not
    // require an active user session in the API process.
    const { data, error } = await this.supabase.admin.auth.getUser(token);

    // Either Supabase returned an explicit error, or data.user is null
    if (error || !data.user) {
      throw new UnauthorizedException("Invalid or expired token");
    }

    // Attach the resolved Supabase user to the request object.
    // RolesGuard (and controllers) read from request.user later.
    request.user = data.user;
    return true;
  }
}

/**
 * RolesGuard — RBAC check against the user's `role` field.
 *
 * This guard is stateful: it is instantiated with the list of roles that
 * are allowed to access the route, e.g. `new RolesGuard(['ADMIN'])`.
 *
 * Precondition: AuthGuard must have run first, so `request.user` is set.
 *
 * The user's role is read from `request.user.role` (typed as UserRole from
 * the shared @playmate/types package). If it is missing or not in the
 * allowed set → 401 Unauthorized (not 403, to avoid leaking role info).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly requiredRoles: UserRole[]) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // Populated by AuthGuard above; may be undefined if AuthGuard was skipped
    const user = request.user;
    const role = user?.role as UserRole;

    // No role OR role not in allow-list → reject.
    if (!role || !this.requiredRoles.includes(role)) {
      throw new UnauthorizedException("Insufficient permissions");
    }

    return true;
  }
}
