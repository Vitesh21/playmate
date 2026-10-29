import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { Button, FormInput } from '@components/ui';
import { useTheme } from '@theme/index';
import { useCreateVenue, useSports } from '@features/venues';

const SPORT_DEFAULT_IMAGES: Record<string, string[]> = {
  badminton: ['https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1000&q=80'],
  tennis: ['https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1000&q=80'],
  football: ['https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1000&q=80'],
  cricket: ['https://images.unsplash.com/photo-1531415074868-836332ff4296?auto=format&fit=crop&w=1000&q=80'],
  pickleball: ['https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1000&q=80'],
  basketball: ['https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1000&q=80'],
  'table-tennis': ['https://images.unsplash.com/photo-1534158914592-062992fbe900?auto=format&fit=crop&w=1000&q=80'],
  swimming: ['https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=1000&q=80'],
};

const AVAILABLE_AMENITIES = [
  'Parking',
  'Floodlights',
  'AC',
  'Shower',
  'Locker Room',
  'Drinking Water',
  'Pro Shop',
  'Cafe',
];

const createVenueSchema = z.object({
  name: z.string().min(2, 'Venue name is required'),
  address: z.string().min(3, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().min(5, 'Pincode must be at least 5 characters'),
  phone: z.string().optional(),
  imageUrl: z.string().url('Must be a valid URL (e.g. https://...)').optional().or(z.literal('')),
  description: z.string().optional(),
});

type CreateVenueForm = z.infer<typeof createVenueSchema>;

function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || 'venue'}-${suffix}`;
}

/** Mediator / Admin: publish a new venue (POST /venues). */
export function CreateVenueScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const navigation = useNavigation();
  const { control, handleSubmit, reset } = useForm<CreateVenueForm>({
    resolver: zodResolver(createVenueSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      phone: '',
      imageUrl: '',
      description: '',
    },
  });

  const { data: sports } = useSports();
  const [sportId, setSportId] = useState<string | undefined>(undefined);
  const [sportError, setSportError] = useState<string | null>(null);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    'Parking',
    'Drinking Water',
  ]);

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const createVenue = useCreateVenue();

  const s = StyleSheet.create({
    container: { padding: spacing.lg, paddingBottom: spacing.xxxxl },
    kicker: { ...typography.caption, color: colors.primary[600], fontWeight: '700' },
    title: { ...typography.h3, color: colors.text.primary, marginTop: spacing.xxs },
    subtitle: { ...typography.body2, color: colors.text.tertiary, marginTop: spacing.xxs },
    section: { ...typography.subtitle2, color: colors.text.secondary, marginTop: spacing.lg, marginBottom: spacing.sm },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
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
    error: { ...typography.caption, color: colors.error[600], marginTop: spacing.xs },
    submit: { marginTop: spacing.xl },
  });

  const onSubmit = (values: CreateVenueForm) => {
    if (!sportId) {
      setSportError('Pick a sport for this venue');
      return;
    }
    setSportError(null);

    const selectedSport = sports?.find((s) => s.id === sportId);
    const fallbackImage =
      (selectedSport && SPORT_DEFAULT_IMAGES[selectedSport.slug]) ||
      SPORT_DEFAULT_IMAGES.badminton;

    const images = values.imageUrl?.trim()
      ? [values.imageUrl.trim()]
      : fallbackImage;

    createVenue.mutate(
      {
        name: values.name,
        slug: slugify(values.name),
        description: values.description || null,
        sportId,
        address: values.address,
        city: values.city,
        state: values.state,
        pincode: values.pincode,
        phone: values.phone || null,
        images,
        amenities: selectedAmenities,
      },
      {
        onSuccess: (venue) => {
          Toast.show({ type: 'success', text1: 'Venue posted successfully!', text2: venue?.name ?? values.name });
          reset();
          setSportId(undefined);
          navigation.goBack();
        },
        onError: (error: any) => {
          Toast.show({
            type: 'error',
            text1: 'Could not post venue',
            text2: error?.message ?? 'Please check connection or fields.',
          });
        },
      },
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Text style={s.kicker}>NEW VENUE LISTING</Text>
        <Text style={s.title}>Add Your Venue</Text>
        <Text style={s.subtitle}>Add details, images, and amenities to start accepting court bookings.</Text>

        <Text style={s.section}>Venue Name</Text>
        <FormInput control={control} name="name" placeholder="e.g. Smash Arena Indiranagar" />

        <Text style={[s.section, { marginTop: spacing.sm }]}>Primary Sport</Text>
        <View style={s.chips}>
          {(sports ?? []).map((sport) => {
            const active = sportId === sport.id;
            return (
              <TouchableOpacity
                key={sport.id}
                style={[s.chip, active && s.chipActive]}
                activeOpacity={0.8}
                onPress={() => {
                  setSportId(sport.id);
                  setSportError(null);
                }}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{sport.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {sportError ? <Text style={s.error}>{sportError}</Text> : null}

        <Text style={s.section}>Location</Text>
        <FormInput control={control} name="address" placeholder="Street address" />
        <FormInput control={control} name="city" placeholder="City" />
        <FormInput control={control} name="state" placeholder="State" />
        <FormInput control={control} name="pincode" placeholder="Pincode" keyboardType="number-pad" />

        <Text style={s.section}>Cover Image URL</Text>
        <FormInput
          control={control}
          name="imageUrl"
          placeholder="https://... (or leave blank to use sport default)"
        />

        <Text style={s.section}>Select Amenities</Text>
        <View style={s.chips}>
          {AVAILABLE_AMENITIES.map((amenity) => {
            const active = selectedAmenities.includes(amenity);
            return (
              <TouchableOpacity
                key={amenity}
                style={[s.chip, active && s.chipActive]}
                activeOpacity={0.8}
                onPress={() => toggleAmenity(amenity)}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>
                  {active ? `✓ ${amenity}` : `+ ${amenity}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={s.section}>Contact & Description</Text>
        <FormInput control={control} name="phone" placeholder="Contact Phone (optional)" keyboardType="phone-pad" />
        <FormInput
          control={control}
          name="description"
          placeholder="Detailed description of venue facilities and guidelines"
          multiline
        />

        <Button
          title={createVenue.isPending ? 'Publishing Venue…' : 'Publish Venue to Database'}
          variant="primary"
          size="lg"
          fullWidth
          loading={createVenue.isPending}
          style={s.submit}
          onPress={handleSubmit(onSubmit)}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default CreateVenueScreen;