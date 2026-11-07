import React, { useCallback, useEffect } from 'react';
import { AppState, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { Booking } from '@playmate/types';
import { useBookings } from '../hooks/useBookings';
import { Badge, Card, EmptyState, ErrorState, LoadingState } from '@components/ui';
import { useTheme } from '@theme/index';
import { formatCurrency, formatDate, formatTime } from '@shared/utils/format';
import { getBookingStatusLabel, getBookingStatusVariant } from '@shared/utils/status';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@shared/services/api';

type BookingRow = Booking & {
  courtSlot?: { date?: string; startTime?: string; endTime?: string } | null;
  court?: { name?: string } | null;
  venue?: { name?: string; address?: string; city?: string } | null;
};

export function BookingsListScreen() {
  const { colors, spacing, typography, radius } = useTheme();
  const bookingsQuery = useBookings({ page: 1, perPage: 100 }, {
    refetchInterval: (query) =>
      query.state.data?.items.some((booking) => booking.status === 'PENDING') ? 5000 : false,
  });
  const gamesQuery = useQuery({
    queryKey: ['games', 'mine'],
    queryFn: () => apiClient.get<{ data: { hosted: Array<{ id: string; title: string; startsAt: string; endsAt: string; status: string }>; joined: Array<{ game: { id: string; title: string; startsAt: string; endsAt: string; status: string }; participation: { status: string } }> } }>('/games/mine').then((response) => response.data),
  });
  const { refetch } = bookingsQuery;

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  useEffect(() => {
    let previousState = AppState.currentState ?? 'active';
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (previousState.match(/inactive|background/) && nextState === 'active') {
        void refetch();
      }
      previousState = nextState;
    });
    return () => subscription.remove();
  }, [refetch]);

  if (bookingsQuery.isLoading) return <LoadingState label="Loading your bookings…" />;
  if (bookingsQuery.isError) {
    return (
      <ErrorState
        title="Could not load bookings"
        description="Check your connection and try again."
      />
    );
  }

  const rows = (bookingsQuery.data?.items ?? []) as BookingRow[];
  const confirmedBookings = rows.filter((booking) => booking.status === 'CONFIRMED');
  const gameEvents = [
    ...(gamesQuery.data?.hosted ?? []).map((game) => ({ ...game, role: 'Hosting' })),
    ...(gamesQuery.data?.joined ?? []).filter(({ participation }) => ['APPROVED', 'REQUESTED', 'WAITLISTED'].includes(participation.status)).map(({ game, participation }) => ({ ...game, role: participation.status === 'APPROVED' ? 'Playing' : participation.status === 'WAITLISTED' ? 'Waitlist' : 'Request pending' })),
  ].filter((game) => new Date(game.endsAt) >= new Date()).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const pendingCount = rows.filter((booking) => booking.status === 'PENDING').length;

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.md }]}
      refreshControl={
        <RefreshControl refreshing={bookingsQuery.isRefetching || gamesQuery.isRefetching} onRefresh={() => { void refetch(); void gamesQuery.refetch(); }} />
      }
    >
      {pendingCount > 0 ? (
        <View
          style={[
            styles.pendingNotice,
            {
              backgroundColor: colors.warning[50],
              borderColor: colors.warning[500],
              borderRadius: radius.md,
              padding: spacing.md,
            },
          ]}
        >
          <Text style={[typography.subtitle2, { color: colors.text.primary }]}>Payment processing</Text>
          <Text style={[typography.body2, { color: colors.text.secondary, marginTop: spacing.xs }]}>
            {pendingCount} slot{pendingCount === 1 ? ' is' : 's are'} held while payment completes.
            A booking appears below only after Playmate verifies payment.
          </Text>
        </View>
      ) : null}

      <Text style={[typography.h5, { color: colors.text.primary, marginTop: spacing.sm }]}>Your games</Text>
      {gamesQuery.isError ? <Text style={[typography.body2, { color: colors.text.tertiary }]}>Games calendar could not load. Pull to refresh.</Text> : null}
      {gameEvents.length === 0 && !gamesQuery.isLoading ? (
        <Text style={[typography.body2, { color: colors.text.tertiary }]}>No upcoming games yet. Host a game or request to join one.</Text>
      ) : gameEvents.map((game) => (
        <Card key={`${game.role}-${game.id}`} padding="lg">
          <View style={styles.header}>
            <View style={styles.titleBlock}>
              <Text style={[typography.subtitle2, { color: colors.text.primary }]}>{game.title}</Text>
              <Text style={[typography.body2, { color: colors.text.secondary, marginTop: 3 }]}>{new Date(game.startsAt).toLocaleString()}</Text>
            </View>
            <Badge label={game.role} variant={game.role === 'Playing' || game.role === 'Hosting' ? 'success' : 'warning'} />
          </View>
        </Card>
      ))}

      <Text style={[typography.h5, { color: colors.text.primary, marginTop: spacing.md }]}>Court bookings</Text>

      {confirmedBookings.length === 0 ? (
        <EmptyState
          title="No confirmed bookings yet"
          description="Your court booking will appear here once payment is verified."
        />
      ) : (
        confirmedBookings.map((booking) => (
          <Card key={booking.id} padding="lg">
            <View style={styles.header}>
              <View style={styles.titleBlock}>
                <Text style={[typography.h5, { color: colors.text.primary }]}>
                  {booking.venue?.name ?? 'Court booking'}
                </Text>
                {booking.court?.name ? (
                  <Text style={[typography.body2, { color: colors.text.secondary, marginTop: 2 }]}>
                    {booking.court.name}
                  </Text>
                ) : null}
              </View>
              <Badge label={getBookingStatusLabel(booking.status)} variant={getBookingStatusVariant(booking.status)} />
            </View>

            {booking.courtSlot?.date ? (
              <Text style={[typography.body1, { color: colors.text.primary, marginTop: spacing.md }]}>
                {formatDate(booking.courtSlot.date, 'long')}
                {booking.courtSlot.startTime && booking.courtSlot.endTime
                  ? ` · ${formatTime(booking.courtSlot.startTime)}–${formatTime(booking.courtSlot.endTime)}`
                  : ''}
              </Text>
            ) : null}
            {booking.venue?.address || booking.venue?.city ? (
              <Text style={[typography.body2, { color: colors.text.tertiary, marginTop: spacing.xs }]}>
                {[booking.venue.address, booking.venue.city].filter(Boolean).join(', ')}
              </Text>
            ) : null}
            <View style={[styles.footer, { borderTopColor: colors.border.light, marginTop: spacing.md, paddingTop: spacing.md }]}>
              <Text style={[typography.caption, { color: colors.text.tertiary }]}>Booking ID · {booking.id.slice(0, 8)}</Text>
              <Text style={[typography.subtitle2, { color: colors.text.primary }]}>
                {formatCurrency(booking.totalAmount)}
              </Text>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  pendingNotice: { borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  titleBlock: { flex: 1 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
