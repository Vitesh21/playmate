import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@theme/index';
import { useSports, useVenues, VenueCard } from '@features/venues';
import { Button, EmptyState, ErrorState, LoadingState } from '@components/ui';
import { useAuthStore } from '@store/auth.store';
import type { HomeStackParamList } from '@navigation/types';
import type { Sport, Venue } from '@playmate/types';

/**
 * Home / "Play" tab — lists bookable venues from the API with a sport filter.
 */
export const HomeScreen: React.FC = () => {
  const { colors, spacing, radius, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const user = useAuthStore((s) => s.user);

  const [sportId, setSportId] = useState<string | undefined>(undefined);

  const sportsQuery = useSports();
  const venuesQuery = useVenues({ sportId });

  const sports: Sport[] = sportsQuery.data ?? [];
  const venues: Venue[] = venuesQuery.data?.items ?? [];

  const sportNameById = useMemo(() => {
    const map = new Map<string, string>();
    sports.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [sports]);

  const s = StyleSheet.create({
    listContent: { paddingBottom: spacing.xxl },
    header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
    greeting: { ...typography.h3, color: colors.text.primary },
    subtitle: { ...typography.body2, color: colors.text.tertiary, marginTop: spacing.xxs },
    chipsRow: { paddingTop: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
    chip: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border.medium,
      backgroundColor: colors.background.primary,
    },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    chipText: { ...typography.subtitle2, color: colors.text.secondary },
    chipTextActive: { color: colors.text.inverse, fontWeight: '700' },
    results: {
      ...typography.caption,
      color: colors.text.tertiary,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    row: { paddingHorizontal: spacing.lg },
    centered: { paddingTop: spacing.xxxxl },
  });

  const renderHeader = () => (
    <View>
      <View style={s.header}>
        <Text style={s.greeting}>
          {user?.firstName ? `Hey ${user.firstName}` : 'Find your next game'}
        </Text>
        <Text style={s.subtitle}>Book a court, we&apos;ll bring the gear.</Text>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[{ id: '__all__', name: 'All' } as unknown as Sport, ...sports]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[s.chipsRow, { paddingHorizontal: spacing.lg }]}
        renderItem={({ item }) => {
          const isAll = item.id === '__all__';
          const active = isAll ? sportId === undefined : sportId === item.id;
          return (
            <TouchableOpacity
              style={[s.chip, active && s.chipActive]}
              onPress={() => setSportId(isAll ? undefined : item.id)}
              activeOpacity={0.8}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>{item.name}</Text>
            </TouchableOpacity>
          );
        }}
      />

      <Text style={s.results}>
        {venuesQuery.isSuccess ? `${venues.length} venue${venues.length === 1 ? '' : 's'}` : ' '}
      </Text>
    </View>
  );

  const renderEmpty = () => {
    if (venuesQuery.isLoading) return <LoadingState label="Finding venues…" style={s.centered} />;
    if (venuesQuery.isError) {
      return (
        <ErrorState
          title="Couldn't load venues"
          description="Check that the API is running and reachable from your device."
          style={s.centered}
          action={
            <Button title="Retry" variant="outline" onPress={() => venuesQuery.refetch()} />
          }
        />
      );
    }
    return (
      <EmptyState
        title="No venues found"
        description={sportId ? 'Try a different sport.' : 'No venues have been added yet.'}
        style={s.centered}
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
            onPress={() => navigation.navigate('VenueDetail', { venueId: item.id })}
          />
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

export default HomeScreen;
