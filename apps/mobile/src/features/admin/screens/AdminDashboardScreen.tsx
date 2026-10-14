import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '@theme/index';
import { Badge, ErrorState, LoadingState } from '@components/ui';
import { useAdminStats, useAdminUsers } from '@features/admin';
import { roleBadgeVariant, roleLabel } from '@utils/index';
import { formatRelativeTime } from '@utils/index';

/** Admin-only dashboard: platform stats + every account and its role. */
export const AdminDashboardScreen: React.FC = () => {
  const { colors, spacing, radius, typography } = useTheme();

  const statsQuery = useAdminStats();
  const usersQuery = useAdminUsers();

  const stats = statsQuery.data;
  const users = usersQuery.data ?? [];

  const s = StyleSheet.create({
    container: { padding: spacing.lg, paddingBottom: spacing.xxl },
    kicker: { ...typography.caption, color: colors.error[600], fontWeight: '700' },
    title: { ...typography.h3, color: colors.text.primary, marginTop: spacing.xxs },
    subtitle: { ...typography.body2, color: colors.text.tertiary, marginTop: spacing.xxs },
    statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
    statCard: {
      flex: 1,
      backgroundColor: colors.background.primary,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border.light,
      padding: spacing.md,
    },
    statValue: { ...typography.h2, color: colors.text.primary },
    statLabel: { ...typography.caption, color: colors.text.tertiary, marginTop: spacing.xxs },
    section: {
      ...typography.h5,
      color: colors.text.primary,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background.primary,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border.light,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    userInfo: { flex: 1, marginRight: spacing.sm },
    userName: { ...typography.subtitle2, color: colors.text.primary },
    userEmail: { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },
    centered: { paddingTop: spacing.xxxxl },
  });

  if (statsQuery.isLoading && usersQuery.isLoading) {
    return <LoadingState label="Loading dashboard…" style={s.centered} />;
  }
  if (statsQuery.isError && usersQuery.isError) {
    return (
      <ErrorState
        title="Couldn't load admin data"
        description="Admin endpoints require the ADMIN role and a running API."
        style={s.centered}
      />
    );
  }

  return (
    <ScrollView
      contentContainerStyle={s.container}
      refreshControl={
        <RefreshControl
          refreshing={statsQuery.isRefetching || usersQuery.isRefetching}
          onRefresh={() => {
            statsQuery.refetch();
            usersQuery.refetch();
          }}
          tintColor={colors.primary[600]}
        />
      }
    >
      <Text style={s.kicker}>ADMIN</Text>
      <Text style={s.title}>Platform overview</Text>
      <Text style={s.subtitle}>Full visibility across users, venues and catalogue.</Text>

      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statValue}>{stats?.users.total ?? '—'}</Text>
          <Text style={s.statLabel}>Users</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statValue}>{stats?.venues.total ?? '—'}</Text>
          <Text style={s.statLabel}>Venues</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statValue}>{stats?.sports.total ?? '—'}</Text>
          <Text style={s.statLabel}>Sports</Text>
        </View>
      </View>

      <Text style={s.section}>Accounts ({users.length})</Text>
      {users.map((u) => (
        <View key={u.id} style={s.userRow}>
          <View style={s.userInfo}>
            <Text style={s.userName} numberOfLines={1}>
              {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || 'Unnamed user'}
            </Text>
            <Text style={s.userEmail} numberOfLines={1}>
              {u.email ?? '—'} · joined {formatRelativeTime(u.createdAt)}
            </Text>
          </View>
          <Badge label={roleLabel(u.role)} variant={roleBadgeVariant(u.role)} size="sm" />
        </View>
      ))}
    </ScrollView>
  );
};

export default AdminDashboardScreen;
