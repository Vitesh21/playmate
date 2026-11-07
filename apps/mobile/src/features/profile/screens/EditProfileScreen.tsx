import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@shared/services/api';
import { useTheme } from '@theme/index';
import { Button, ErrorState, LoadingState } from '@components/ui';

type PlayerProfile = { firstName?: string | null; lastName?: string | null; avatarUrl?: string | null; profile?: Record<string, any> };
type Envelope<T> = { data: T };

export default function EditProfileScreen() {
  const { colors, spacing, typography, radius } = useTheme();
  const cache = useQueryClient();
  const profileQuery = useQuery({ queryKey: ['player-profile'], queryFn: () => apiClient.get<Envelope<PlayerProfile>>('/users/me/profile').then((response) => response.data) });
  const [fields, setFields] = useState({ firstName: '', lastName: '', avatarUrl: '', bio: '', city: '', area: '', visibility: 'PUBLIC', showGames: true, showCalendar: false, showHomeArea: false, preferredTimes: '' });
  useEffect(() => {
    const profile = profileQuery.data?.profile ?? {};
    setFields({
      firstName: profileQuery.data?.firstName ?? '',
      lastName: profileQuery.data?.lastName ?? '',
      avatarUrl: profileQuery.data?.avatarUrl ?? '',
      bio: profile.bio ?? '',
      city: profile.homeLocation?.city ?? '',
      area: profile.homeLocation?.area ?? '',
      visibility: profile.privacy?.profileVisibility ?? 'PUBLIC',
      showGames: profile.privacy?.showGames ?? true,
      showCalendar: profile.privacy?.showCalendar ?? false,
      showHomeArea: profile.privacy?.showHomeArea ?? false,
      preferredTimes: (profile.preferredTimes ?? []).join(', '),
    });
  }, [profileQuery.data]);
  const save = useMutation({
    mutationFn: () => apiClient.patch('/users/me/profile', {
      firstName: fields.firstName,
      lastName: fields.lastName,
      avatarUrl: fields.avatarUrl || undefined,
      bio: fields.bio,
      homeLocation: fields.city ? { city: fields.city, area: fields.area } : undefined,
      preferredTimes: fields.preferredTimes.split(',').map((value) => value.trim().toUpperCase()).filter(Boolean),
      privacy: { profileVisibility: fields.visibility, showGames: fields.showGames, showCalendar: fields.showCalendar, showHomeArea: fields.showHomeArea },
    }),
    onSuccess: () => { void cache.invalidateQueries({ queryKey: ['player-profile'] }); Alert.alert('Profile saved', 'Your profile and privacy choices have been updated.'); },
    onError: (error: any) => Alert.alert('Could not save profile', error?.message ?? 'Check your details and try again.'),
  });
  const set = (key: keyof typeof fields, value: string | boolean) => setFields((current) => ({ ...current, [key]: value }));
  const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.background.screen }, content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl }, title: { ...typography.h3, color: colors.text.primary }, subtitle: { ...typography.body2, color: colors.text.secondary }, label: { ...typography.subtitle2, color: colors.text.primary, marginBottom: spacing.xs }, field: { borderWidth: 1, borderColor: colors.border.medium, borderRadius: radius.md, paddingHorizontal: spacing.md, minHeight: 48, color: colors.text.primary, backgroundColor: colors.background.primary, ...typography.body1 }, section: { ...typography.h5, color: colors.text.primary, marginTop: spacing.md }, toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 }, options: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' } });
  if (profileQuery.isLoading) return <LoadingState label="Loading your profile…" />;
  if (profileQuery.isError) return <ErrorState title="Could not load your profile" description="Check your connection and retry." action={<Button title="Retry" variant="outline" onPress={() => void profileQuery.refetch()} />} />;
  const input = (label: string, key: keyof typeof fields, placeholder: string, multiline = false) => <View><Text style={styles.label}>{label}</Text><TextInput style={[styles.field, multiline && { minHeight: 100, textAlignVertical: 'top', paddingTop: spacing.md }]} value={String(fields[key])} onChangeText={(value) => set(key, value)} placeholder={placeholder} placeholderTextColor={colors.text.tertiary} multiline={multiline} maxLength={key === 'bio' ? 500 : 160} /></View>;
  return <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={styles.title}>Player profile</Text><Text style={styles.subtitle}>Keep your details current and control what other players can see.</Text>
    {input('First name', 'firstName', 'First name')}{input('Last name', 'lastName', 'Last name')}{input('Profile photo URL', 'avatarUrl', 'https://…')}{input('Bio', 'bio', 'A little about you and how you play', true)}
    <Text style={styles.section}>Home area · coarse location</Text>{input('City', 'city', 'City')}{input('Area', 'area', 'Neighborhood or broad area')}{input('Preferred play times', 'preferredTimes', 'MORNING, EVENING')}
    <Text style={styles.section}>Profile visibility</Text><View style={styles.options}>{(['PUBLIC', 'PLAYPALS', 'PRIVATE'] as const).map((choice) => <Button key={choice} title={choice === 'PLAYPALS' ? 'Playpals' : choice[0] + choice.slice(1).toLowerCase()} size="sm" variant={fields.visibility === choice ? 'primary' : 'outline'} onPress={() => set('visibility', choice)} />)}</View>
    {([['Show my games', 'showGames'], ['Show my calendar', 'showCalendar'], ['Show my broad home area', 'showHomeArea']] as const).map(([label, key]) => <View key={key} style={styles.toggle}><Text style={styles.subtitle}>{label}</Text><Switch value={fields[key]} onValueChange={(value) => set(key, value)} trackColor={{ true: colors.primary[500] }} /></View>)}
    <Button title="Save profile" loading={save.isPending} onPress={() => save.mutate()} />
  </ScrollView>;
}
