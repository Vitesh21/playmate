import React from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
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
 * managing own venues. Users never see this tab.
 */
export const ManageVenuesScreen: React.FC = () => {
  const { colors, spacing, typography } = useTheme();
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
    row: { paddingHorizontal: spacing.lg },
    listContent: { paddingBottom: spacing.xxl },
    centered: { paddingTop: spacing.xxxxl },
  });

  const renderHeader = () => (
    <View style={s.header}>
      <Text style={s.kicker}>{roleLabel(user?.role).toUpperCase()} WORKSPACE</Text>
      <Text style={s.title}>Your venues</Text>
      <Text style={s.subtitle}>
        {venues.length} listing{venues.length === 1 ? '' : 's'} · publish new courts and manage your
        pro shop
      </Text>
      <Button
        title="+  Post a new venue"
        variant="primary"
        size="lg"
        fullWidth
        style={s.cta}
        onPress={() => navigation.navigate('CreateVenue')}
      />
    </View>
  );

  const renderEmpty = () => {
    if (venuesQuery.isLoading) return <LoadingState label="Loading your venues…" style={s.centered} />;
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
          <VenueCard venue={item} sportName={sportNameById.get(item.sportId)} />
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
