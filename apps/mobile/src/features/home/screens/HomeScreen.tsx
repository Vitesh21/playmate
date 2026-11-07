import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Pressable,
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
  const [searchText, setSearchText] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [courtType, setCourtType] = useState<'INDOOR' | 'OUTDOOR' | undefined>();
  const [amenity, setAmenity] = useState<string | undefined>();
  const [minRating, setMinRating] = useState<number | undefined>();
  const [availableNow, setAvailableNow] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const sportsQuery = useSports();
  const venuesQuery = useVenues({
    sportId,
    search: searchText.trim() || undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    courtType,
    amenities: amenity,
    utcOffsetMinutes: -new Date().getTimezoneOffset(),
    minRating,
    availableNow: availableNow || undefined,
  });

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
    searchField: { borderWidth: 1, borderColor: colors.border.medium, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.background.primary, color: colors.text.primary, marginTop: spacing.md, fontSize: 16 },
    filterBar: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, alignItems: 'center' },
    filterToggle: { borderWidth: 1, borderColor: colors.border.medium, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    filterText: { ...typography.caption, color: colors.text.primary, fontWeight: '700' },
    filterPanel: { marginTop: spacing.sm, padding: spacing.md, gap: spacing.sm, borderRadius: radius.md, backgroundColor: colors.background.primary, borderWidth: 1, borderColor: colors.border.light },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    filterChip: { borderWidth: 1, borderColor: colors.border.medium, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    filterChipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    priceRow: { flexDirection: 'row', gap: spacing.sm },
    priceField: { flex: 1, borderWidth: 1, borderColor: colors.border.medium, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text.primary, backgroundColor: colors.background.primary },
  });

  const renderHeader = () => (
    <View>
      <View style={s.header}>
        <Text style={s.greeting}>
          {user?.firstName ? `Hey ${user.firstName}` : 'Find your next game'}
        </Text>
        <Text style={s.subtitle}>Book a court, we&apos;ll bring the gear.</Text>
        <TextInput
          accessibilityLabel="Search venues or city"
          style={s.searchField}
          placeholder="Search venues or city"
          placeholderTextColor={colors.text.tertiary}
          value={searchText}
          onChangeText={setSearchText}
          returnKeyType="search"
        />
        <View style={s.filterBar}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showFilters }} style={s.filterToggle} onPress={() => setShowFilters((value) => !value)}>
            <Text style={s.filterText}>{showFilters ? 'Hide filters' : 'Filters'}</Text>
          </Pressable>
          {(courtType || amenity || minPrice || maxPrice || minRating || availableNow) ? <Pressable accessibilityRole="button" onPress={() => { setCourtType(undefined); setAmenity(undefined); setMinPrice(''); setMaxPrice(''); setMinRating(undefined); setAvailableNow(false); }}><Text style={s.filterText}>Clear filters</Text></Pressable> : null}
        </View>
        {showFilters ? <View style={s.filterPanel}>
          <Text style={s.filterText}>Hourly price (₹)</Text>
          <View style={s.priceRow}>
            <TextInput accessibilityLabel="Minimum hourly price" style={s.priceField} keyboardType="number-pad" placeholder="Min" placeholderTextColor={colors.text.tertiary} value={minPrice} onChangeText={setMinPrice} />
            <TextInput accessibilityLabel="Maximum hourly price" style={s.priceField} keyboardType="number-pad" placeholder="Max" placeholderTextColor={colors.text.tertiary} value={maxPrice} onChangeText={setMaxPrice} />
          </View>
          <Text style={s.filterText}>Court type</Text>
          <View style={s.filterRow}>{(['INDOOR', 'OUTDOOR'] as const).map((type) => <Pressable key={type} accessibilityRole="button" accessibilityState={{ selected: courtType === type }} style={[s.filterChip, courtType === type && s.filterChipActive]} onPress={() => setCourtType(courtType === type ? undefined : type)}><Text style={s.filterText}>{type === 'INDOOR' ? 'Indoor' : 'Outdoor'}</Text></Pressable>)}</View>
          <Text style={s.filterText}>Availability and rating</Text>
          <View style={s.filterRow}>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: availableNow }} style={[s.filterChip, availableNow && s.filterChipActive]} onPress={() => setAvailableNow((value) => !value)}><Text style={s.filterText}>Available now</Text></Pressable>
            {[4, 4.5].map((rating) => <Pressable key={rating} accessibilityRole="button" accessibilityState={{ selected: minRating === rating }} style={[s.filterChip, minRating === rating && s.filterChipActive]} onPress={() => setMinRating(minRating === rating ? undefined : rating)}><Text style={s.filterText}>{rating}+ ★</Text></Pressable>)}
          </View>
          <Text style={s.filterText}>Amenities</Text>
          <View style={s.filterRow}>{['Parking', 'Washroom', 'Lights', 'Equipment rental', 'Changing rooms'].map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: amenity === value }} style={[s.filterChip, amenity === value && s.filterChipActive]} onPress={() => setAmenity(amenity === value ? undefined : value)}><Text style={s.filterText}>{value}</Text></Pressable>)}</View>
        </View> : null}
        <View style={{ marginTop: spacing.md }}>
          <Button title="Find or host a game" variant="outline" onPress={() => navigation.navigate('Games')} />
          <View style={{ height: spacing.sm }} />
          <Button title="Your playpals" variant="ghost" onPress={() => navigation.navigate('Playpals')} />
          <Button title="Your groups" variant="ghost" onPress={() => navigation.navigate('Groups')} />
        </View>
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
          onRefresh={() => { void venuesQuery.refetch(); }}
          tintColor={colors.primary[600]}
        />
      }
    />
  );
};

export default HomeScreen;
