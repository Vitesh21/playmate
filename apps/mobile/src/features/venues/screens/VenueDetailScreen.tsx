import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { useTheme } from '@theme/index';
import { useVenue, useVenueCourts, useCourtSlots, useCreateBooking } from '../hooks/useVenues';
import { Button, LoadingState, ErrorState } from '@components/ui';
import type { Court, CourtSlot } from '@playmate/types';

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
];

export const VenueDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { colors, spacing, radius, typography } = useTheme();

  const venueId = route.params?.venueId;
  const venueQuery = useVenue(venueId);
  const courtsQuery = useVenueCourts(venueId);

  // Generate date chips for next 7 days
  const today = new Date();
  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
    const formatted = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    return { dateStr, label: `${dayName}, ${formatted}` };
  });

  const [selectedDate, setSelectedDate] = useState<string>(dateOptions[0].dateStr);
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const courts: Court[] = courtsQuery.data ?? [];
  const activeCourtId = selectedCourtId || (courts.length > 0 ? courts[0].id : null);

  const slotsQuery = useCourtSlots(activeCourtId || '', selectedDate);
  const slots: CourtSlot[] = slotsQuery.data ?? [];

  const bookingMutation = useCreateBooking();

  const handleBookSlot = async () => {
    if (!selectedSlotId) {
      Toast.show({ type: 'error', text1: 'Please select an available slot' });
      return;
    }

    try {
      const res: any = await bookingMutation.mutateAsync({ courtSlotId: selectedSlotId });
      const bookingId = res?.booking?.id || res?.bookingId || 'Confirmed';
      Toast.show({
        type: 'success',
        text1: 'Slot Reserved!',
        text2: `Booking #${bookingId.slice(0, 8)} · Ready for payment`,
      });
      // Refresh slots
      slotsQuery.refetch();
      setSelectedSlotId(null);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Booking failed',
        text2: err?.response?.data?.message || err?.message || 'Unable to book court slot',
      });
    }
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background.screen },
    heroImage: { width: '100%', height: 230, backgroundColor: colors.background.secondary },
    content: { padding: spacing.lg },
    title: { ...typography.h2, color: colors.text.primary, marginBottom: spacing.xs },
    address: { ...typography.body2, color: colors.text.secondary, marginBottom: spacing.sm },
    desc: { ...typography.body1, color: colors.text.tertiary, marginBottom: spacing.lg, lineHeight: 22 },
    sectionTitle: { ...typography.h4, color: colors.text.primary, marginTop: spacing.md, marginBottom: spacing.sm },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
    amenityChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.md,
      backgroundColor: colors.background.secondary,
      borderWidth: 1,
      borderColor: colors.border.light,
    },
    amenityText: { ...typography.caption, color: colors.text.secondary },
    dateTabs: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.xs },
    dateTab: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.background.primary,
      borderWidth: 1,
      borderColor: colors.border.medium,
    },
    dateTabActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    dateTabText: { ...typography.caption, color: colors.text.secondary, fontWeight: '600' },
    dateTabTextActive: { color: colors.text.inverse, fontWeight: '700' },
    courtTabs: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm },
    courtTab: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: colors.background.primary,
      borderWidth: 1,
      borderColor: colors.border.medium,
    },
    courtTabActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    courtTabText: { ...typography.subtitle2, color: colors.text.secondary },
    courtTabTextActive: { color: colors.text.inverse, fontWeight: '700' },
    slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.md },
    slotCard: {
      width: '30%',
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border.medium,
      backgroundColor: colors.background.primary,
      alignItems: 'center',
    },
    slotCardActive: { borderColor: colors.primary[600], backgroundColor: colors.primary[50] },
    slotCardDisabled: { opacity: 0.35, backgroundColor: colors.background.secondary },
    slotTime: { ...typography.subtitle2, color: colors.text.primary, fontWeight: '600' },
    slotPrice: { ...typography.caption, color: colors.text.secondary, marginTop: 4 },
    footer: {
      padding: spacing.lg,
      backgroundColor: colors.background.primary,
      borderTopWidth: 1,
      borderTopColor: colors.border.light,
    },
  });

  if (venueQuery.isLoading) return <LoadingState label="Loading venue from database..." />;
  if (venueQuery.isError || !venueQuery.data) {
    return <ErrorState title="Venue not found" description="Unable to load this venue from database." />;
  }

  const venue = venueQuery.data;
  const heroUrl = venue.images?.[0] || PLACEHOLDER_IMAGES[0];

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <Image source={{ uri: heroUrl }} style={s.heroImage} resizeMode="cover" />
        <View style={s.content}>
          <Text style={s.title}>{venue.name}</Text>
          <Text style={s.address}>📍 {venue.address}, {venue.city}</Text>
          {venue.phone ? <Text style={s.address}>📞 {venue.phone}</Text> : null}
          <Text style={s.desc}>{venue.description}</Text>

          {venue.amenities && venue.amenities.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Facilities & Amenities</Text>
              <View style={s.chipsRow}>
                {venue.amenities.map((a: string, i: number) => (
                  <View key={i} style={s.amenityChip}>
                    <Text style={s.amenityText}>✓ {a}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <Text style={s.sectionTitle}>Select Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dateTabs}>
            {dateOptions.map((opt) => {
              const isActive = opt.dateStr === selectedDate;
              return (
                <TouchableOpacity
                  key={opt.dateStr}
                  style={[s.dateTab, isActive && s.dateTabActive]}
                  onPress={() => {
                    setSelectedDate(opt.dateStr);
                    setSelectedSlotId(null);
                  }}
                >
                  <Text style={[s.dateTabText, isActive && s.dateTabTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={s.sectionTitle}>Select Court</Text>
          {courtsQuery.isLoading ? (
            <ActivityIndicator style={{ marginVertical: spacing.md }} />
          ) : courts.length === 0 ? (
            <Text style={{ color: colors.text.tertiary, marginVertical: spacing.sm }}>
              No courts added yet for this venue.
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.courtTabs}>
              {courts.map((court) => {
                const isActive = court.id === activeCourtId;
                return (
                  <TouchableOpacity
                    key={court.id}
                    style={[s.courtTab, isActive && s.courtTabActive]}
                    onPress={() => {
                      setSelectedCourtId(court.id);
                      setSelectedSlotId(null);
                    }}
                  >
                    <Text style={[s.courtTabText, isActive && s.courtTabTextActive]}>
                      {court.name} (₹{court.hourlyRate}/hr)
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <Text style={s.sectionTitle}>Available Slot Timings</Text>
          {slotsQuery.isLoading ? (
            <ActivityIndicator style={{ marginVertical: spacing.md }} />
          ) : slots.length === 0 ? (
            <Text style={{ color: colors.text.tertiary, marginVertical: spacing.sm }}>
              No slots available for the selected court & date.
            </Text>
          ) : (
            <View style={s.slotsGrid}>
              {slots.map((slot) => {
                const isSelected = slot.id === selectedSlotId;
                const isAvail = slot.isAvailable;
                return (
                  <TouchableOpacity
                    key={slot.id}
                    disabled={!isAvail}
                    style={[
                      s.slotCard,
                      isSelected && s.slotCardActive,
                      !isAvail && s.slotCardDisabled,
                    ]}
                    onPress={() => setSelectedSlotId(slot.id)}
                  >
                    <Text style={s.slotTime}>{slot.startTime} - {slot.endTime}</Text>
                    <Text style={s.slotPrice}>
                      {isAvail ? `₹${slot.price}` : 'Booked'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={s.footer}>
        <Button
          title={selectedSlotId ? "Book Selected Slot Now" : "Select a Slot Timing"}
          variant="primary"
          size="lg"
          fullWidth
          disabled={!selectedSlotId || bookingMutation.isPending}
          loading={bookingMutation.isPending}
          onPress={handleBookSlot}
        />
      </View>
    </View>
  );
};

export default VenueDetailScreen;
