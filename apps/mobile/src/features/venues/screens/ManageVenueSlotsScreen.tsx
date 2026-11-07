import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Toast from 'react-native-toast-message';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Button, FormInput } from '@components/ui';
import { useTheme } from '@theme/index';
import { useCreateCourt, useBulkCreateSlots, useVenueCourts, useCourtSlots, useSetCourtSlotAvailability } from '../hooks/useVenues';
import type { CourtSlot } from '@playmate/types';

const createCourtSchema = z.object({
  name: z.string().min(2, 'Court name is required (e.g. Court 1)'),
  type: z.string().default('Indoor'),
  surface: z.string().default('Synthetic Wood'),
  hourlyRate: z.string().min(1, 'Hourly rate is required'),
});

type CreateCourtForm = z.infer<typeof createCourtSchema>;

const OPEN_WINDOWS = [[6 * 60, 11 * 60], [16 * 60, 22 * 60]] as const;

function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTime(totalMinutes: number): string {
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
}

export const ManageVenueSlotsScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { colors, spacing, radius, typography } = useTheme();

  const venueId = route.params?.venueId;
  const venueName = route.params?.venueName || 'Venue';

  const { data: courts = [], refetch: refetchCourts } = useVenueCourts(venueId);
  const createCourt = useCreateCourt();
  const bulkCreateSlots = useBulkCreateSlots();

  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [slotDurationMinutes, setSlotDurationMinutes] = useState<30 | 60 | 90>(60);

  const { control, handleSubmit, reset } = useForm<CreateCourtForm>({
    resolver: zodResolver(createCourtSchema),
    defaultValues: {
      name: '',
      type: 'Indoor',
      surface: 'Synthetic Wood',
      hourlyRate: '400',
    },
  });

  const handleAddCourt = async (values: CreateCourtForm) => {
    try {
      const rate = parseInt(values.hourlyRate, 10) || 400;
      const newCourt = await createCourt.mutateAsync({
        venueId,
        name: values.name,
        type: values.type,
        surface: values.surface,
        hourlyRate: rate,
      });

      Toast.show({
        type: 'success',
        text1: 'Court Created!',
        text2: `${newCourt?.name ?? values.name} added to ${venueName}`,
      });
      reset();
      refetchCourts();
      if (newCourt?.id) {
        setSelectedCourtId(newCourt.id);
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to create court',
        text2: err?.message || 'Please check fields.',
      });
    }
  };

  const handleGenerateSlots = async (targetCourtId: string) => {
    const court = courts.find((c) => c.id === targetCourtId);
    if (!court) return;

    setIsGenerating(true);
    try {
      const today = new Date();
      const slotsPayload: Array<{
        courtId: string;
        date: string;
        startTime: string;
        endTime: string;
        price: number;
        isAvailable: boolean;
      }> = [];

      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateStr = formatLocalDate(d);

        for (const [windowStart, windowEnd] of OPEN_WINDOWS) {
          for (let start = windowStart; start + slotDurationMinutes <= windowEnd; start += slotDurationMinutes) {
            slotsPayload.push({
              courtId: court.id,
              date: dateStr,
              startTime: formatTime(start),
              endTime: formatTime(start + slotDurationMinutes),
              price: Math.round((court.hourlyRate || 400) * slotDurationMinutes / 60),
              isAvailable: true,
            });
          }
        }
      }

      await bulkCreateSlots.mutateAsync({
        courtId: court.id,
        slots: slotsPayload,
      });

      Toast.show({
        type: 'success',
        text1: 'Slots Generated!',
        text2: `Generated ${slotDurationMinutes}-minute slots for ${court.name} (next 7 days)`,
      });
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Slot generation failed',
        text2: err?.message || 'Could not save slots to database',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background.screen },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxxxl },
    kicker: { ...typography.caption, color: colors.primary[600], fontWeight: '700' },
    title: { ...typography.h3, color: colors.text.primary, marginTop: spacing.xxs },
    subtitle: { ...typography.body2, color: colors.text.tertiary, marginTop: spacing.xxs, marginBottom: spacing.lg },
    section: { ...typography.subtitle2, color: colors.text.primary, marginTop: spacing.lg, marginBottom: spacing.sm },
    card: {
      backgroundColor: colors.background.primary,
      padding: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border.light,
      marginBottom: spacing.md,
    },
    courtHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    courtTitle: { ...typography.h4, color: colors.text.primary },
    courtSubtitle: { ...typography.body2, color: colors.text.secondary, marginTop: 2 },
    slotBtn: { marginTop: spacing.md },
    secondaryBtn: { marginTop: spacing.sm },
    durationChoices: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    durationChoice: { borderWidth: 1, borderColor: colors.border.medium, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.background.primary },
    durationChoiceActive: { borderColor: colors.primary[600], backgroundColor: colors.primary[600] },
    durationChoiceText: { ...typography.caption, color: colors.text.secondary, fontWeight: '700' },
    durationChoiceTextActive: { color: colors.text.inverse },
  });

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.kicker}>SLOTS & COURTS MANAGEMENT</Text>
        <Text style={s.title}>{venueName}</Text>
        <Text style={s.subtitle}>Add courts, set base rates, choose a slot length, and publish availability.</Text>

        <Text style={s.section}>Slot duration</Text>
        <View style={s.durationChoices}>
          {([30, 60, 90] as const).map((minutes) => (
            <TouchableOpacity key={minutes} accessibilityRole="button" accessibilityState={{ selected: slotDurationMinutes === minutes }} style={[s.durationChoice, slotDurationMinutes === minutes && s.durationChoiceActive]} onPress={() => setSlotDurationMinutes(minutes)}>
              <Text style={[s.durationChoiceText, slotDurationMinutes === minutes && s.durationChoiceTextActive]}>{minutes} min</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.section}>Existing Courts ({courts.length})</Text>
        {courts.length === 0 ? (
          <View style={s.card}>
            <Text style={{ color: colors.text.tertiary }}>
              No courts added for this venue yet. Create one below to enable bookings!
            </Text>
          </View>
        ) : (
          courts.map((court) => (
            <View key={court.id} style={s.card}>
              <View style={s.courtHeader}>
                <View>
                  <Text style={s.courtTitle}>{court.name}</Text>
                  <Text style={s.courtSubtitle}>
                    {court.type || 'Indoor'} · {court.surface || 'Standard'} · ₹{court.hourlyRate}/hr
                  </Text>
                </View>
              </View>
              <Button
                title={isGenerating ? "Publishing availability…" : `⚡ Generate 7 days · ${slotDurationMinutes} min`}
                variant="outline"
                size="sm"
                style={s.slotBtn}
                loading={isGenerating}
                onPress={() => handleGenerateSlots(court.id)}
              />
              <Button
                title={selectedCourtId === court.id ? 'Hide slot calendar' : 'View / block slots'}
                variant="ghost"
                size="sm"
                style={s.secondaryBtn}
                onPress={() => setSelectedCourtId(selectedCourtId === court.id ? null : court.id)}
              />
            </View>
          ))
        )}

        {selectedCourtId ? <CourtAvailabilityPanel courtId={selectedCourtId} /> : null}

        <Text style={s.section}>+ Add a New Court</Text>
        <View style={s.card}>
          <FormInput control={control} name="name" placeholder="Court Name (e.g. Court 4, Turf A)" />
          <FormInput control={control} name="type" placeholder="Type (e.g. Indoor, Outdoor, Astroturf)" />
          <FormInput control={control} name="surface" placeholder="Surface (e.g. Synthetic Wood, Clay, Grass)" />
          <FormInput
            control={control}
            name="hourlyRate"
            placeholder="Hourly Rate (₹)"
            keyboardType="number-pad"
          />

          <Button
            title={createCourt.isPending ? "Creating Court…" : "+ Add Court to Venue"}
            variant="primary"
            size="md"
            loading={createCourt.isPending}
            style={{ marginTop: spacing.md }}
            onPress={handleSubmit(handleAddCourt)}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const CourtAvailabilityPanel: React.FC<{ courtId: string }> = ({ courtId }) => {
  const { colors, spacing, radius, typography } = useTheme();
  const query = useCourtSlots(courtId);
  const setAvailability = useSetCourtSlotAvailability();
  const slots: CourtSlot[] = query.data ?? [];
  const styles = StyleSheet.create({
    card: { backgroundColor: colors.background.primary, borderWidth: 1, borderColor: colors.border.light, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
    heading: { ...typography.subtitle2, color: colors.text.primary, marginBottom: spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.light },
    label: { ...typography.caption, color: colors.text.primary, flex: 1 },
    state: { ...typography.caption, color: colors.text.tertiary },
  });
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Availability overrides</Text>
      <Text style={[typography.caption, { color: colors.text.tertiary, marginBottom: spacing.sm }]}>Block slots for maintenance or private events. Booked and payment-held slots are protected.</Text>
      {query.isLoading ? <Text style={styles.state}>Loading slot calendar…</Text> : query.isError ? <Button title="Retry" variant="outline" onPress={() => void query.refetch()} /> : slots.length === 0 ? <Text style={styles.state}>No slots published yet. Generate availability first.</Text> : slots.slice(0, 24).map((slot) => (
        <View key={slot.id} style={styles.row}>
          <Text style={styles.label}>{new Date(`${slot.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · {slot.startTime}–{slot.endTime}</Text>
          <Button
            title={slot.isAvailable ? 'Block' : 'Reopen'}
            variant={slot.isAvailable ? 'outline' : 'ghost'}
            size="sm"
            loading={setAvailability.isPending && setAvailability.variables?.slotId === slot.id}
            disabled={setAvailability.isPending || Boolean((slot as CourtSlot & { isHeld?: boolean }).isHeld)}
            onPress={() => setAvailability.mutate({ courtId, slotId: slot.id, isAvailable: !slot.isAvailable }, { onError: (error: any) => Alert.alert('Could not update slot', error?.message ?? 'Please refresh and try again.') })}
          />
        </View>
      ))}
      {slots.length > 24 ? <Text style={[styles.state, { marginTop: spacing.sm }]}>Showing the next 24 slots.</Text> : null}
    </View>
  );
};

export default ManageVenueSlotsScreen;
