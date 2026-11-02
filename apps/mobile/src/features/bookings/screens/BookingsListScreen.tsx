import React, { useCallback, useEffect } from 'react';
import { AppState, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { Booking } from '@playmate/types';
import { useBookings } from '../hooks/useBookings';
import { Badge, Card, EmptyState, ErrorState, LoadingState } from '@components/ui';
import { useTheme } from '@theme/index';
import { formatCurrency, formatDate, formatTime } from '@shared/utils/format';
import { getBookingStatusLabel, getBookingStatusVariant } from '@shared/utils/status';

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
  const pendingCount = rows.filter((booking) => booking.status === 'PENDING').length;

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.md }]}
      refreshControl={
        <RefreshControl refreshing={bookingsQuery.isRefetching} onRefresh={() => void refetch()} />
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
