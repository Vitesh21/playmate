import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@theme/index';
import { Badge, Button, Card } from '@components/ui';
import { useAuthStore } from '@store/auth.store';
import { roleBadgeVariant, roleLabel } from '@utils/index';
import { UserRole } from '@playmate/types';

const ROLE_BLURB: Record<string, string> = {
  [UserRole.ADMIN]:
    'Full control of the platform: venues, catalogue, bookings and accounts.',
  [UserRole.VENUE_OWNER]:
    'Post venues, manage availability and your venue pro shop.',
  [UserRole.SELLER]: 'Manage your product catalogue and inventory.',
  [UserRole.USER]: 'Book courts, rent gear and shop equipment.',
};

/** Profile tab — account details, current role and sign out. */
export const ProfileScreen: React.FC = () => {
  const { colors, spacing, radius, typography } = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isLoading = useAuthStore((s) => s.isLoading);

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Player';
  const initials =
    [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() ||
    (user?.email?.[0] ?? 'P').toUpperCase();

  const s = StyleSheet.create({
    container: { padding: spacing.lg, paddingBottom: spacing.xxl },
    hero: { alignItems: 'center', paddingVertical: spacing.xl },
    avatar: {
      width: 88,
      height: 88,
      borderRadius: radius.full,
      backgroundColor: colors.primary[600],
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    avatarText: { ...typography.h2, color: colors.text.inverse },
    name: { ...typography.h4, color: colors.text.primary },
    email: { ...typography.body2, color: colors.text.tertiary, marginTop: spacing.xxs, marginBottom: spacing.sm },
    card: { marginBottom: spacing.md },
    rowLabel: { ...typography.caption, color: colors.text.tertiary },
    rowValue: { ...typography.body1, color: colors.text.primary, marginTop: spacing.xxs },
    blurb: { ...typography.body2, color: colors.text.secondary, marginTop: spacing.sm },
    signOut: { marginTop: spacing.lg },
  });

  return (
    <ScrollView contentContainerStyle={s.container}>
      <View style={s.hero}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <Text style={s.name}>{fullName}</Text>
        <Text style={s.email}>{user?.email ?? '—'}</Text>
        <Badge label={roleLabel(user?.role)} variant={roleBadgeVariant(user?.role)} />
      </View>

      <Card elevation="sm" style={s.card}>
        <Text style={s.rowLabel}>SIGNED IN AS</Text>
        <Text style={s.rowValue}>{roleLabel(user?.role)}</Text>
        <Text style={s.blurb}>{ROLE_BLURB[user?.role ?? UserRole.USER] ?? ''}</Text>
      </Card>

      <Button
        title="Sign out"
        variant="danger"
        size="lg"
        fullWidth
        loading={isLoading}
        style={s.signOut}
        onPress={() => {
          logout().catch(() => undefined);
        }}
      />
    </ScrollView>
  );
};

export default ProfileScreen;
