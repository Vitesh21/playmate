import { UserRole } from '@playmate/types';

/** Human labels for each role. "Mediator" is the product name for VENUE_OWNER. */
export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.VENUE_OWNER]: 'Mediator',
  [UserRole.SELLER]: 'Seller',
  [UserRole.USER]: 'Player',
};

export type RoleBadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'primary'
  | 'secondary';

export const ROLE_BADGE_VARIANT: Record<UserRole, RoleBadgeVariant> = {
  [UserRole.ADMIN]: 'error',
  [UserRole.VENUE_OWNER]: 'primary',
  [UserRole.SELLER]: 'secondary',
  [UserRole.USER]: 'default',
};

export function roleLabel(role?: string | null): string {
  if (!role) return 'Player';
  return ROLE_LABELS[role as UserRole] ?? role;
}

export function roleBadgeVariant(role?: string | null): RoleBadgeVariant {
  if (!role) return 'default';
  return ROLE_BADGE_VARIANT[role as UserRole] ?? 'default';
}
