import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@shared/services/api';
import { useTheme } from '@theme/index';
import { Badge, ErrorState, LoadingState } from '@components/ui';
import { useAdminStats, useAdminUsers } from '@features/admin';
import { roleBadgeVariant, roleLabel } from '@utils/index';
import { formatRelativeTime } from '@utils/index';
import { Button } from '@components/ui';
import { usePendingVenues, useVerifyVenue } from '../hooks/useAdmin';
import { formatCurrency } from '@shared/utils/format';

/** Admin-only dashboard: platform stats + every account and its role. */
export const AdminDashboardScreen: React.FC = () => {
  const { colors, spacing, radius, typography } = useTheme();

  const statsQuery = useAdminStats();
  const usersQuery = useAdminUsers();
  const pendingVenuesQuery = usePendingVenues();
  const verifyVenue = useVerifyVenue();
  const queryClient = useQueryClient();
  const reportsQuery = useQuery({
    queryKey: ['admin', 'reports', 'open'],
    queryFn: () => apiClient.get<{ data: Array<{ id: string; targetType: string; targetId: string; reason: string; createdAt: string }> }>('/reports/admin/open').then((response) => response.data ?? []),
  });
  const resolveReport = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIONED' | 'DISMISSED' }) => apiClient.patch(`/reports/admin/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'reports', 'open'] }),
  });

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
    venueAddress: { ...typography.caption, color: colors.text.tertiary, marginTop: 3 },
    venueActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
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
          refreshing={statsQuery.isRefetching || usersQuery.isRefetching || reportsQuery.isRefetching}
          onRefresh={() => {
            statsQuery.refetch();
            usersQuery.refetch();
            pendingVenuesQuery.refetch();
            reportsQuery.refetch();
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

      <View style={[s.statsRow, { flexWrap: 'wrap' }]}>
        <View style={s.statCard}>
          <Text style={s.statValue}>{stats?.activeUsers30d ?? '—'}</Text>
          <Text style={s.statLabel}>Active players · 30 days</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statValue}>{stats ? formatCurrency(stats.revenue.gmv) : '—'}</Text>
          <Text style={s.statLabel}>GMV · before refunds</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statValue}>{stats ? `${stats.occupancy.fillRatePercent}%` : '—'}</Text>
          <Text style={s.statLabel}>Upcoming slot fill rate</Text>
        </View>
      </View>
      <View style={[s.statsRow, { flexWrap: 'wrap' }]}>
        <View style={s.statCard}>
          <Text style={s.statValue}>{stats?.bookings.total ?? '—'}</Text>
          <Text style={s.statLabel}>Bookings · all statuses</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statValue}>{stats?.repeatCustomers ?? '—'}</Text>
          <Text style={s.statLabel}>Repeat customers</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statValue}>{stats ? formatCurrency(stats.revenue.net) : '—'}</Text>
          <Text style={s.statLabel}>Net collected after refunds</Text>
        </View>
      </View>

      <Text style={s.section}>Venue verification ({pendingVenuesQuery.data?.length ?? 0})</Text>
      {(pendingVenuesQuery.data ?? []).map((venue) => (
        <View key={venue.id} style={s.userRow}>
          <View style={s.userInfo}>
            <Text style={s.userName}>{venue.name}</Text>
            <Text style={s.venueAddress}>{venue.address}, {venue.city}, {venue.state}</Text>
            <View style={s.venueActions}>
              <Button title="Approve" size="sm" loading={verifyVenue.isPending} onPress={() => verifyVenue.mutate({ id: venue.id, status: 'APPROVED' })} />
              <Button title="Reject" size="sm" variant="outline" loading={verifyVenue.isPending} onPress={() => verifyVenue.mutate({ id: venue.id, status: 'REJECTED' })} />
            </View>
          </View>
        </View>
      ))}

      <Text style={s.section}>Community reports ({reportsQuery.data?.length ?? 0})</Text>
      {(reportsQuery.data ?? []).map((report) => (
        <View key={report.id} style={s.userRow}>
          <View style={s.userInfo}>
            <Text style={s.userName}>{report.targetType} report · {report.targetId.slice(0, 8)}</Text>
            <Text style={s.userEmail}>{report.reason}</Text>
            <View style={s.venueActions}>
              <Button title="Take action" size="sm" loading={resolveReport.isPending} onPress={() => resolveReport.mutate({ id: report.id, status: 'ACTIONED' })} />
              <Button title="Dismiss" size="sm" variant="outline" loading={resolveReport.isPending} onPress={() => resolveReport.mutate({ id: report.id, status: 'DISMISSED' })} />
            </View>
          </View>
        </View>
      ))}

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
