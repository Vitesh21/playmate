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
import { useSports, useVenues, useFavoriteVenues, useToggleFavoriteVenue, VenueCard } from '@features/venues';
import { Button, EmptyState, ErrorState, LoadingState } from '@components/ui';
import { useAuthStore } from '@store/auth.store';
import type { HomeStackParamList } from '@navigation/types';
import type { Sport, Venue } from '@playmate/types';

function localDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

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
  const [surface, setSurface] = useState<string | undefined>();
  const [searchDate, setSearchDate] = useState<string | undefined>();
  const [timeWindow, setTimeWindow] = useState<'morning' | 'afternoon' | 'evening' | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);

  const sportsQuery = useSports();
  const venuesQuery = useVenues({
    sportId,
    search: searchText.trim() || undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    courtType,
    surface,
    date: searchDate ?? (timeWindow ? localDateString(new Date()) : undefined),
    startTime: timeWindow === 'morning' ? '06:00' : timeWindow === 'afternoon' ? '12:00' : timeWindow === 'evening' ? '17:00' : undefined,
    endTime: timeWindow === 'morning' ? '12:00' : timeWindow === 'afternoon' ? '17:00' : timeWindow === 'evening' ? '23:00' : undefined,
    amenities: amenity,
    utcOffsetMinutes: -new Date().getTimezoneOffset(),
    minRating,
    availableNow: availableNow || undefined,
  });
  const favoritesQuery = useFavoriteVenues();
  const toggleFavorite = useToggleFavoriteVenue();

  const sports: Sport[] = sportsQuery.data ?? [];
  const favoriteEntries = favoritesQuery.data ?? [];
  const favoriteIds = new Set(favoriteEntries.map(({ venue }) => venue.id));
  const venues: Venue[] = showFavorites
    ? favoriteEntries.map(({ venue }) => venue)
    : venuesQuery.data?.items ?? [];

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
    favoriteToggle: { alignSelf: 'flex-end', marginTop: -spacing.sm, marginBottom: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: colors.background.primary, borderWidth: 1, borderColor: colors.border.light },
    favoriteToggleText: { ...typography.caption, color: colors.primary[700], fontWeight: '700' },
  });

  const renderHeader = () => (
    <View>
      <View style={s.header}>
        <Text style={s.greeting}>
          {user?.firstName ? `Hey ${user.firstName}` : 'Find your next game'}
        </Text>
        <Text style={s.subtitle}>Book a court, we&apos;ll bring the gear.</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: !showFavorites }} style={[s.filterToggle, !showFavorites && s.chipActive]} onPress={() => setShowFavorites(false)}><Text style={s.filterText}>Explore venues</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: showFavorites }} style={[s.filterToggle, showFavorites && s.chipActive]} onPress={() => setShowFavorites(true)}><Text style={s.filterText}>♥ Saved ({favoriteEntries.length})</Text></Pressable>
        </View>
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
          {(courtType || surface || amenity || minPrice || maxPrice || minRating || availableNow || searchDate || timeWindow) ? <Pressable accessibilityRole="button" onPress={() => { setCourtType(undefined); setSurface(undefined); setAmenity(undefined); setMinPrice(''); setMaxPrice(''); setMinRating(undefined); setAvailableNow(false); setSearchDate(undefined); setTimeWindow(undefined); }}><Text style={s.filterText}>Clear filters</Text></Pressable> : null}
        </View>
        {showFilters ? <View style={s.filterPanel}>
          <Text style={s.filterText}>Hourly price (₹)</Text>
          <View style={s.priceRow}>
            <TextInput accessibilityLabel="Minimum hourly price" style={s.priceField} keyboardType="number-pad" placeholder="Min" placeholderTextColor={colors.text.tertiary} value={minPrice} onChangeText={setMinPrice} />
            <TextInput accessibilityLabel="Maximum hourly price" style={s.priceField} keyboardType="number-pad" placeholder="Max" placeholderTextColor={colors.text.tertiary} value={maxPrice} onChangeText={setMaxPrice} />
          </View>
          <Text style={s.filterText}>Court type</Text>
          <View style={s.filterRow}>{(['INDOOR', 'OUTDOOR'] as const).map((type) => <Pressable key={type} accessibilityRole="button" accessibilityState={{ selected: courtType === type }} style={[s.filterChip, courtType === type && s.filterChipActive]} onPress={() => setCourtType(courtType === type ? undefined : type)}><Text style={s.filterText}>{type === 'INDOOR' ? 'Indoor' : 'Outdoor'}</Text></Pressable>)}</View>
          <Text style={s.filterText}>Surface</Text>
          <View style={s.filterRow}>{['wood', 'synthetic turf', 'clay', 'concrete'].map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: surface === value }} style={[s.filterChip, surface === value && s.filterChipActive]} onPress={() => setSurface(surface === value ? undefined : value)}><Text style={s.filterText}>{value.replace(/\b\w/g, (character) => character.toUpperCase())}</Text></Pressable>)}</View>
          <Text style={s.filterText}>Day and time</Text>
          <View style={s.filterRow}>
            {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
              const day = new Date();
              day.setDate(day.getDate() + offset);
              const value = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
              const label = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : day.toLocaleDateString(undefined, { weekday: 'short' });
              return <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: searchDate === value }} style={[s.filterChip, searchDate === value && s.filterChipActive]} onPress={() => setSearchDate(searchDate === value ? undefined : value)}><Text style={s.filterText}>{label}</Text></Pressable>;
            })}
          </View>
          <View style={s.filterRow}>{([['morning', 'Morning'], ['afternoon', 'Afternoon'], ['evening', 'Evening']] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: timeWindow === value }} style={[s.filterChip, timeWindow === value && s.filterChipActive]} onPress={() => setTimeWindow(timeWindow === value ? undefined : value)}><Text style={s.filterText}>{label}</Text></Pressable>)}</View>
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
        {(showFavorites ? favoritesQuery.isSuccess : venuesQuery.isSuccess) ? `${venues.length} venue${venues.length === 1 ? '' : 's'}${showFavorites ? ' saved' : ''}` : ' '}
      </Text>
    </View>
  );

  const renderEmpty = () => {
    if (showFavorites && favoritesQuery.isLoading) return <LoadingState label="Loading saved venues…" style={s.centered} />;
    if (!showFavorites && venuesQuery.isLoading) return <LoadingState label="Finding venues…" style={s.centered} />;
    if ((showFavorites && favoritesQuery.isError) || (!showFavorites && venuesQuery.isError)) {
      return (
        <ErrorState
          title={showFavorites ? "Couldn't load saved venues" : "Couldn't load venues"}
          description="Check your connection and try again."
          style={s.centered}
          action={<Button title="Retry" variant="outline" onPress={() => void (showFavorites ? favoritesQuery.refetch() : venuesQuery.refetch())} />}
        />
      );
    }
    return (
      <EmptyState
        title={showFavorites ? 'No saved venues yet' : 'No venues found'}
        description={showFavorites ? 'Save venues with the heart button and they will be easy to find here.' : sportId ? 'Try a different sport.' : 'No venues have been added yet.'}
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
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={favoriteIds.has(item.id) ? `Remove ${item.name} from saved venues` : `Save ${item.name}`}
            disabled={toggleFavorite.isPending}
            style={s.favoriteToggle}
            onPress={() => toggleFavorite.mutate({ venueId: item.id, isFavorite: favoriteIds.has(item.id) })}
          >
            <Text style={s.favoriteToggleText}>{favoriteIds.has(item.id) ? '♥ Saved' : '♡ Save venue'}</Text>
          </TouchableOpacity>
        </View>
      )}
      refreshControl={
        <RefreshControl
          refreshing={venuesQuery.isRefetching || favoritesQuery.isRefetching}
          onRefresh={() => { void venuesQuery.refetch(); void favoritesQuery.refetch(); }}
          tintColor={colors.primary[600]}
        />
      }
    />
  );
};

export default HomeScreen;
