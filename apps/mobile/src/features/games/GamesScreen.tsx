import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@shared/services/api';
import { useSports } from '@features/venues';
import { useTheme } from '@theme/index';
import { Button, EmptyState, ErrorState, LoadingState } from '@components/ui';

type Game = { id: string; title: string; notes?: string | null; startsAt: string; endsAt: string; maxPlayers: number; costPerPlayer: number; instantJoin: boolean; sportId: string };

export const GamesScreen: React.FC = () => {
  const { colors, spacing, radius, typography } = useTheme();
  const queryClient = useQueryClient();
  const sportsQuery = useSports();
  const sports = sportsQuery.data ?? [];
  const [showHost, setShowHost] = useState(false);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [players, setPlayers] = useState('4');
  const [sportId, setSportId] = useState('');
  const [startAt, setStartAt] = useState(() => new Date(Date.now() + 86400000).toISOString());
  const gamesQuery = useQuery({ queryKey: ['games'], queryFn: () => apiClient.get<{ success: boolean; data: Game[] }>('/games').then((r) => r.data) });
  const refresh = () => gamesQuery.refetch();
  const join = useMutation({ mutationFn: (id: string) => apiClient.post(`/games/${id}/join`, {}), onSuccess: () => { Alert.alert('Request sent', 'The host will review your request.'); void refresh(); } });
  const create = useMutation({
    mutationFn: () => {
      const start = new Date(startAt);
      if (!Number.isFinite(start.getTime())) throw new Error('Enter a valid ISO date and time.');
      return apiClient.post('/games', { sportId: sportId || sports[0]?.id, title: title.trim(), notes: notes.trim() || undefined, startsAt: start.toISOString(), endsAt: new Date(start.getTime() + 3600000).toISOString(), maxPlayers: Number(players), visibility: 'PUBLIC', instantJoin: false, costPerPlayer: 0 });
    },
    onSuccess: () => { setShowHost(false); setTitle(''); setNotes(''); void queryClient.invalidateQueries({ queryKey: ['games'] }); Alert.alert('Game posted', 'Players can now request to join.'); },
    onError: (error: Error) => Alert.alert('Could not post game', error.message),
  });
  const sportNames = useMemo(() => new Map(sports.map((sport) => [sport.id, sport.name])), [sports]);
  const styles = StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.background.screen },
    header: { padding: spacing.lg, gap: spacing.md },
    title: { ...typography.h3, color: colors.text.primary },
    subtitle: { ...typography.body2, color: colors.text.secondary },
    card: { marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.background.primary, borderWidth: 1, borderColor: colors.border.light, gap: spacing.sm },
    gameTitle: { ...typography.h5, color: colors.text.primary },
    detail: { ...typography.body2, color: colors.text.secondary },
    modal: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.background.screen },
    field: { borderWidth: 1, borderColor: colors.border.medium, borderRadius: radius.md, padding: spacing.md, color: colors.text.primary, marginBottom: spacing.md },
    hint: { ...typography.caption, color: colors.text.tertiary, marginBottom: spacing.md },
  });
  return (
    <View style={styles.page}>
      <View style={styles.header}><Text style={styles.title}>Games near you</Text><Text style={styles.subtitle}>Find a game or bring your own crew together.</Text><Button title="Host a game" onPress={() => setShowHost(true)} /></View>
      {gamesQuery.isLoading ? <LoadingState label="Finding games…" /> : gamesQuery.isError ? <ErrorState title="Couldn't load games" description="Check your connection and try again." action={<Button title="Retry" variant="outline" onPress={() => void refresh()} />} /> : (
        <FlatList data={gamesQuery.data ?? []} keyExtractor={(item) => item.id} refreshControl={<RefreshControl refreshing={gamesQuery.isRefetching} onRefresh={() => void refresh()} />} ListEmptyComponent={<EmptyState title="No open games yet" description="Host the first game in your area." />} renderItem={({ item }) => (
          <View style={styles.card}><Text style={styles.gameTitle}>{item.title}</Text><Text style={styles.detail}>{sportNames.get(item.sportId) ?? 'Sport'} · {new Date(item.startsAt).toLocaleString()}</Text><Text style={styles.detail}>Up to {item.maxPlayers} players · {item.costPerPlayer ? `₹${item.costPerPlayer} per player` : 'Free to join'}</Text>{item.notes ? <Text style={styles.detail}>{item.notes}</Text> : null}<Button title={item.instantJoin ? 'Join game' : 'Request to join'} onPress={() => join.mutate(item.id)} loading={join.isPending} /></View>
        )} />
      )}
      <Modal visible={showHost} animationType="slide" onRequestClose={() => setShowHost(false)}>
        <View style={styles.modal}>
          <Text style={[styles.title, { marginBottom: spacing.md }]}>Host a public game</Text>
          <TextInput style={styles.field} placeholder="Game title" placeholderTextColor={colors.text.tertiary} value={title} onChangeText={setTitle} maxLength={120} />
          <TextInput style={styles.field} placeholder="Sport ID (or use first listed sport)" placeholderTextColor={colors.text.tertiary} value={sportId} onChangeText={setSportId} autoCapitalize="none" />
          {sports.length > 0 ? <Pressable onPress={() => setSportId(sports[0].id)}><Text style={styles.hint}>Use {sports[0].name}</Text></Pressable> : null}
          <TextInput style={styles.field} placeholder="Start time (ISO 8601)" placeholderTextColor={colors.text.tertiary} value={startAt} onChangeText={setStartAt} autoCapitalize="none" />
          <Text style={styles.hint}>Example: 2026-11-08T18:00:00+05:30. Games last one hour; the host counts as a player.</Text>
          <TextInput style={styles.field} placeholder="Maximum players" placeholderTextColor={colors.text.tertiary} keyboardType="number-pad" value={players} onChangeText={setPlayers} />
          <TextInput style={[styles.field, { minHeight: 80 }]} placeholder="Notes (optional)" placeholderTextColor={colors.text.tertiary} value={notes} onChangeText={setNotes} multiline />
          <Button title="Post game" onPress={() => create.mutate()} loading={create.isPending} disabled={!title.trim() || Number(players) < 2 || (!sportId && !sports[0])} /><View style={{ height: spacing.sm }} /><Button title="Cancel" variant="outline" onPress={() => setShowHost(false)} />
        </View>
      </Modal>
    </View>
  );
};

export default GamesScreen;
