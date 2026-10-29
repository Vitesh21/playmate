import React from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@theme/index';
import { Button, EmptyState, ErrorState, LoadingState } from '@components/ui';
import { useMyVenues, useSports, VenueCard } from '@features/venues';
import { useAuthStore } from '@store/auth.store';
import { roleLabel } from '@utils/index';
import type { ManageStackParamList } from '@navigation/types';
import type { Venue } from '@playmate/types';

/**
 * "Manage" tab — the Mediator (VENUE_OWNER) / Admin view for posting and
 * managing own venues and their courts/slots.
 */
export const ManageVenuesScreen: React.FC = () => {
  const { colors, spacing, typography, radius } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ManageStackParamList>>();
  const user = useAuthStore((s) => s.user);

  const venuesQuery = useMyVenues();
  const sportsQuery = useSports();

  const venues: Venue[] = venuesQuery.data ?? [];
  const sportNameById = new Map((sportsQuery.data ?? []).map((s) => [s.id, s.name]));

  const s = StyleSheet.create({
    header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
    kicker: { ...typography.caption, color: colors.primary[600], fontWeight: '700' },
    title: { ...typography.h3, color: colors.text.primary, marginTop: spacing.xxs },
    subtitle: { ...typography.body2, color: colors.text.tertiary, marginTop: spacing.xxs },
    cta: { marginTop: spacing.lg },
    row: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
    listContent: { paddingBottom: spacing.xxl },
    centered: { paddingTop: spacing.xxxxl },
    manageRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.sm,
      marginTop: -spacing.xs,
      marginBottom: spacing.sm,
    },
    manageBtn: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.primary[50],
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.primary[200],
    },
    manageBtnText: {
      ...typography.caption,
      color: colors.primary[700],
      fontWeight: '600',
    },
  });

  const renderHeader = () => (
    <View style={s.header}>
      <Text style={s.kicker}>{roleLabel(user?.role).toUpperCase()} WORKSPACE</Text>
      <Text style={s.title}>Your Venues</Text>
      <Text style={s.subtitle}>
        {venues.length} venue listing{venues.length === 1 ? '' : 's'} in database · manage courts, slot timings and pricing
      </Text>
      <Button
        title="+  Post a New Venue"
        variant="primary"
        size="lg"
        fullWidth
        style={s.cta}
        onPress={() => navigation.navigate('CreateVenue')}
      />
    </View>
  );

  const renderEmpty = () => {
    if (venuesQuery.isLoading) return <LoadingState label="Loading your venues from database…" style={s.centered} />;
    if (venuesQuery.isError) {
      return (
        <ErrorState
          title="Couldn't load your venues"
          description="Check that the API is running and reachable."
          style={s.centered}
          action={<Button title="Retry" variant="outline" onPress={() => venuesQuery.refetch()} />}
        />
      );
    }
    return (
      <EmptyState
        title="No venues yet"
        description="Post your first venue to start receiving court bookings."
        style={s.centered}
        action={
          <Button
            title="Post a venue"
            variant="outline"
            onPress={() => navigation.navigate('CreateVenue')}
          />
        }
      />
    );
  };

  return (
    <FlatList
      data={venues}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
      contentContainerStyle={s.listContent}
      renderItem={({ item }) => (
        <View style={s.row}>
          <VenueCard
            venue={item}
            sportName={sportNameById.get(item.sportId)}
            onPress={() => (navigation as any).navigate('ManageSlots', {
              venueId: item.id,
              venueName: item.name,
            })}
          />
          <View style={s.manageRow}>
            <TouchableOpacity
              style={s.manageBtn}
              onPress={() => (navigation as any).navigate('ManageSlots', {
                venueId: item.id,
                venueName: item.name,
              })}
            >
              <Text style={s.manageBtnText}>⚙️ Manage Courts & Slots</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      refreshControl={
        <RefreshControl
          refreshing={venuesQuery.isRefetching}
          onRefresh={() => venuesQuery.refetch()}
          tintColor={colors.primary[600]}
        />
      }
    />
  );
};

export default ManageVenuesScreen;
