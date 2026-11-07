import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@shared/services/api';
import { useSports, useVenues } from '@features/venues';
import { useTheme } from '@theme/index';
import { Button, EmptyState, ErrorState, LoadingState } from '@components/ui';
import type { Sport, Venue } from '@playmate/types';

type Game = {
  id: string;
  hostId: string;
  title: string;
  notes?: string | null;
  startsAt: string;
  endsAt: string;
  maxPlayers: number;
  costPerPlayer: number;
  instantJoin: boolean;
  sportId: string;
  venueId?: string | null;
  status?: string;
  visibility?: 'PUBLIC' | 'PRIVATE';
};

type Participant = { id: string; userId: string; status: string; role?: string; message?: string | null; player?: { firstName?: string | null; lastName?: string | null; avatarUrl?: string | null } };
type ApiEnvelope<T> = { success: boolean; data: T; message?: string | string[] };

const localDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const explainError = (error: any) => {
  if (error?.status === 401 || error?.response?.status === 401) return 'Your sign-in expired. Please sign in again, then try once more.';
  const value = error?.message ?? error?.response?.data?.message;
  if (Array.isArray(value)) return value.join('\n');
  return typeof value === 'string' && value.trim() ? value : 'Please check your connection and try again.';
};

export const GamesScreen: React.FC = () => {
  const { colors, spacing, radius, typography } = useTheme();
  const queryClient = useQueryClient();
  const sportsQuery = useSports();
  const venuesQuery = useVenues({});
  const sports = sportsQuery.data ?? [];
  const venues = venuesQuery.data?.items ?? [];
  const [showHost, setShowHost] = useState(false);
  const [requestsGame, setRequestsGame] = useState<Game | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [players, setPlayers] = useState('4');
  const [cost, setCost] = useState('0');
  const [sportId, setSportId] = useState('');
  const [venueId, setVenueId] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return localDateKey(tomorrow);
  });
  const [startTime, setStartTime] = useState('18:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [instantJoin, setInstantJoin] = useState(false);
  const [privateGame, setPrivateGame] = useState(false);

  const dateOptions = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    const label = index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : date.toLocaleDateString(undefined, { weekday: 'short' });
    return { value: localDateKey(date), label, detail: date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) };
  }), []);
  const timeOptions = ['07:00', '09:00', '11:00', '13:00', '15:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

  const gamesQuery = useQuery({
    queryKey: ['games', 'discover'],
    queryFn: () => apiClient.get<ApiEnvelope<Game[]>>('/games').then((response) => response.data ?? []),
  });
  const mineQuery = useQuery({
    queryKey: ['games', 'mine'],
    queryFn: () => apiClient.get<ApiEnvelope<{ hosted: Game[]; joined: Array<{ game: Game; participation: Participant }> }>>('/games/mine').then((response) => response.data),
  });
  const playpalsQuery = useQuery({
    queryKey: ['friends'],
    queryFn: () => apiClient.get<ApiEnvelope<Array<{ id: string; firstName?: string; lastName?: string }>>>('/friends').then((response) => response.data ?? []),
  });
  const invitesQuery = useQuery({
    queryKey: ['games', 'invites'],
    queryFn: () => apiClient.get<ApiEnvelope<Array<{ invite: { id: string }; game: Game }>>>('/games/invites').then((response) => response.data ?? []),
  });
  const participantsQuery = useQuery({
    queryKey: ['games', requestsGame?.id, 'participants'],
    enabled: !!requestsGame,
    queryFn: () => apiClient.get<ApiEnvelope<Participant[]>>(`/games/${requestsGame!.id}/participants`).then((response) => response.data ?? []),
  });
  const refresh = () => Promise.all([gamesQuery.refetch(), mineQuery.refetch()]);

  const join = useMutation({
    mutationFn: ({ id, message }: { id: string; message?: string }) => apiClient.post<ApiEnvelope<Participant>>(`/games/${id}/join`, { message }),
    onSuccess: (response) => {
      const status = response.data?.status;
      Alert.alert(status === 'APPROVED' ? 'You’re in' : status === 'WAITLISTED' ? 'Added to waitlist' : 'Request sent', status === 'APPROVED' ? 'You joined this game.' : status === 'WAITLISTED' ? 'The game is full. You’ll be notified if a place opens.' : 'The host will review your request.');
      void refresh();
    },
    onError: (error) => Alert.alert('Could not join game', explainError(error)),
  });

  const create = useMutation({
    mutationFn: () => {
      const selectedSport = sportId || sports[0]?.id;
      if (!selectedSport) throw new Error('Choose a sport to continue.');
      if (title.trim().length < 3) throw new Error('Add a game name with at least 3 characters.');
      const totalPlayers = Number(players);
      if (!Number.isInteger(totalPlayers) || totalPlayers < 2 || totalPlayers > 100) throw new Error('Choose between 2 and 100 total players, including yourself.');
      const price = Number(cost || 0);
      if (!Number.isInteger(price) || price < 0) throw new Error('Enter a whole-number cost per player, or 0 for free.');
      const startsAt = new Date(`${startDate}T${startTime}:00`);
      if (!Number.isFinite(startsAt.getTime()) || startsAt.getTime() <= Date.now()) throw new Error('Choose a start time in the future.');
      const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
      return apiClient.post<ApiEnvelope<Game>>('/games', {
        sportId: selectedSport,
        venueId: venueId || null,
        title: title.trim(),
        notes: notes.trim() || undefined,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        maxPlayers: totalPlayers,
        visibility: privateGame ? 'PRIVATE' : 'PUBLIC',
        instantJoin,
        costPerPlayer: price,
      });
    },
    onSuccess: () => {
      setShowHost(false);
      setTitle('');
      setNotes('');
      setVenueId('');
      setPlayers('4');
      setCost('0');
      setInstantJoin(false);
      setPrivateGame(false);
      void queryClient.invalidateQueries({ queryKey: ['games'] });
      Alert.alert('Game posted', privateGame ? 'Your invite-only game is ready. Invite your Playpals from My games.' : 'Your game is now visible to nearby players. You can review join requests from My games.');
    },
    onError: (error) => Alert.alert('Could not post game', explainError(error)),
  });

  const decide = useMutation({
    mutationFn: ({ participantId, approve }: { participantId: string; approve: boolean }) => apiClient.patch(`/games/${requestsGame!.id}/participants/${participantId}`, { approve }),
    onSuccess: () => {
      void participantsQuery.refetch();
      void queryClient.invalidateQueries({ queryKey: ['games'] });
    },
    onError: (error) => Alert.alert('Could not update request', explainError(error)),
  });
  const appointCohost = useMutation({
    mutationFn: (participantId: string) => apiClient.post(`/games/${requestsGame!.id}/participants/${participantId}/cohost`, {}),
    onSuccess: () => { void participantsQuery.refetch(); Alert.alert('Co-host added', 'They can now review and manage join requests.'); },
    onError: (error) => Alert.alert('Could not appoint co-host', explainError(error)),
  });
  const leave = useMutation({
    mutationFn: (gameId: string) => apiClient.post(`/games/${gameId}/leave`, {}),
    onSuccess: () => {
      Alert.alert('Left game', 'You are no longer on the player list.');
      void refresh();
    },
    onError: (error) => Alert.alert('Could not leave game', explainError(error)),
  });
  const decideInvite = useMutation({
    mutationFn: ({ inviteId, accept }: { inviteId: string; accept: boolean }) => apiClient.patch(`/games/invites/${inviteId}`, { accept }),
    onSuccess: () => { void invitesQuery.refetch(); void refresh(); },
    onError: (error) => Alert.alert('Could not update invite', explainError(error)),
  });
  const sendInvite = (game: Game) => {
    const pals = playpalsQuery.data ?? [];
    if (!pals.length) { Alert.alert('Add Playpals first', 'You can invite accepted Playpals to a game.'); return; }
    Alert.alert('Invite a Playpal', `Choose who to invite to ${game.title}.`, [
      ...pals.slice(0, 4).map((pal) => ({ text: [pal.firstName, pal.lastName].filter(Boolean).join(' ') || 'Playpal', onPress: () => { void apiClient.post(`/games/${game.id}/invites`, { inviteeId: pal.id }).then(() => Alert.alert('Invite sent', 'Your Playpal can accept it from Find a game.')).catch((error) => Alert.alert('Could not send invite', explainError(error))); } })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const styles = StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.background.screen },
    header: { padding: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
    title: { ...typography.h3, color: colors.text.primary },
    subtitle: { ...typography.body2, color: colors.text.secondary, lineHeight: 21 },
    sectionTitle: { ...typography.h5, color: colors.text.primary, marginHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.sm },
    card: { marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.background.primary, borderWidth: 1, borderColor: colors.border.light, gap: spacing.sm },
    gameTitle: { ...typography.h5, color: colors.text.primary },
    detail: { ...typography.body2, color: colors.text.secondary },
    badge: { ...typography.caption, color: colors.primary[700], fontWeight: '700' },
    modal: { flex: 1, backgroundColor: colors.background.screen },
    modalHeader: { padding: spacing.lg, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border.light },
    form: { padding: spacing.lg, gap: spacing.sm },
    label: { ...typography.subtitle2, color: colors.text.primary, marginTop: spacing.sm },
    hint: { ...typography.caption, color: colors.text.tertiary, lineHeight: 18 },
    field: { borderWidth: 1, borderColor: colors.border.medium, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, color: colors.text.primary, backgroundColor: colors.background.primary, fontSize: 16 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.xs },
    chip: { borderWidth: 1, borderColor: colors.border.medium, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.background.primary },
    chipSelected: { borderColor: colors.primary[600], backgroundColor: colors.primary[600] },
    chipText: { ...typography.caption, color: colors.text.secondary, fontWeight: '600' },
    chipTextSelected: { color: colors.text.inverse },
    row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
    requestCard: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.background.primary, borderWidth: 1, borderColor: colors.border.light, gap: spacing.xs },
  });

  const Choice = ({ label, selected, onPress, detail }: { label: string; selected: boolean; onPress: () => void; detail?: string }) => (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}{detail ? `\n${detail}` : ''}</Text>
    </Pressable>
  );

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Find a game</Text>
        <Text style={styles.subtitle}>Join a local game or host one of your own. Public games are open to nearby players.</Text>
        <Button title="Host a game" onPress={() => setShowHost(true)} />
      </View>

      {mineQuery.data?.hosted?.length ? <Text style={styles.sectionTitle}>Your hosted games</Text> : null}
      {mineQuery.data?.hosted?.map((game) => (
        <View key={game.id} style={styles.card}>
          <Text style={styles.gameTitle}>{game.title}</Text>
          <Text style={styles.detail}>{new Date(game.startsAt).toLocaleString()} · {game.status === 'FULL' ? 'Full' : 'Open'}</Text>
          <Button title="Manage join requests" variant="outline" onPress={() => setRequestsGame(game)} />
          <Button title="Invite a Playpal" variant="outline" onPress={() => sendInvite(game)} />
        </View>
      ))}

      {invitesQuery.data?.length ? <Text style={styles.sectionTitle}>Game invites</Text> : null}
      {invitesQuery.data?.map(({ invite, game }) => (
        <View key={invite.id} style={styles.card}>
          <Text style={styles.gameTitle}>{game.title}</Text>
          <Text style={styles.detail}>{new Date(game.startsAt).toLocaleString()} · Invite only</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}><Button title="Accept" onPress={() => decideInvite.mutate({ inviteId: invite.id, accept: true })} loading={decideInvite.isPending} /></View>
            <View style={{ flex: 1 }}><Button title="Decline" variant="outline" onPress={() => decideInvite.mutate({ inviteId: invite.id, accept: false })} loading={decideInvite.isPending} /></View>
          </View>
        </View>
      ))}

      {mineQuery.data?.joined?.length ? <Text style={styles.sectionTitle}>Games you joined</Text> : null}
      {mineQuery.data?.joined?.map(({ game, participation }) => (
        <View key={game.id} style={styles.card}>
          <Text style={styles.gameTitle}>{game.title}</Text>
          <Text style={styles.detail}>{new Date(game.startsAt).toLocaleString()} · {participation.status === 'REQUESTED' ? 'Waiting for host approval' : participation.status === 'WAITLISTED' ? 'On the waitlist' : participation.status === 'APPROVED' ? 'You’re confirmed' : participation.status}</Text>
          {['REQUESTED', 'WAITLISTED', 'APPROVED'].includes(participation.status) ? <Button title="Leave game" variant="outline" onPress={() => leave.mutate(game.id)} loading={leave.isPending} /> : null}
        </View>
      ))}

      <Text style={styles.sectionTitle}>Games open to join</Text>
      {gamesQuery.isLoading ? <LoadingState label="Finding games…" /> : gamesQuery.isError ? <ErrorState title="Couldn’t load games" description="Check your connection, then try again." action={<Button title="Retry" variant="outline" onPress={() => void refresh()} />} /> : (
        <FlatList
          data={gamesQuery.data ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={gamesQuery.isRefetching || mineQuery.isRefetching} onRefresh={() => void refresh()} />}
          contentContainerStyle={{ paddingBottom: spacing.xl, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState title="No open games yet" description="Host the first game in your area. Your public game will appear here." />}
          renderItem={({ item }) => {
            const sport = sports.find((entry: Sport) => entry.id === item.sportId)?.name ?? 'Sport';
            const venue = venues.find((entry: Venue) => entry.id === item.venueId)?.name;
            return (
              <View style={styles.card}>
                <Text style={styles.gameTitle}>{item.title}</Text>
                <Text style={styles.detail}>{sport} · {new Date(item.startsAt).toLocaleString()}</Text>
                <Text style={styles.detail}>{venue ? `${venue} · ` : ''}{item.maxPlayers} total players, including host · {item.costPerPlayer ? `₹${item.costPerPlayer} per player` : 'Free'}</Text>
                {item.notes ? <Text style={styles.detail}>{item.notes}</Text> : null}
                <Button title={item.status === 'FULL' ? 'Join waitlist' : item.instantJoin ? 'Join game' : 'Request to join'} onPress={() => join.mutate({ id: item.id })} loading={join.isPending} />
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Button title="Report game" variant="outline" onPress={() => Alert.alert('Report this game', 'Choose why you are reporting it.', [
                    { text: 'Unsafe or abusive', onPress: () => { void apiClient.post('/reports', { targetType: 'GAME', targetId: item.id, targetUserId: item.hostId, reason: 'Unsafe or abusive game content' }).then(() => Alert.alert('Report sent', 'Our moderation team will review it.')).catch((error) => Alert.alert('Could not send report', explainError(error))); } },
                    { text: 'Spam or misleading', onPress: () => { void apiClient.post('/reports', { targetType: 'GAME', targetId: item.id, targetUserId: item.hostId, reason: 'Spam or misleading game content' }).then(() => Alert.alert('Report sent', 'Our moderation team will review it.')).catch((error) => Alert.alert('Could not send report', explainError(error))); } },
                    { text: 'Cancel', style: 'cancel' },
                  ])} />
                  <Button title="Block host" variant="outline" onPress={() => Alert.alert('Block this host?', 'Their public games will be hidden from you.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Block host', style: 'destructive', onPress: () => { void apiClient.post(`/users/${item.hostId}/block`, {}).then(() => { void queryClient.invalidateQueries({ queryKey: ['games'] }); Alert.alert('Host blocked', 'Their public games are now hidden from you.'); }).catch((error) => Alert.alert('Could not block host', explainError(error))); } },
                  ])} />
                </View>
              </View>
            );
          }}
        />
      )}

      <Modal visible={showHost} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setShowHost(false)}>
        <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <Text style={styles.title}>Host a game</Text>
            <Text style={styles.subtitle}>Choose the sport, time and number of players. Your game will be listed publicly.</Text>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
            <Text style={styles.label}>Game name</Text>
            <TextInput style={styles.field} placeholder="e.g. Evening badminton doubles" placeholderTextColor={colors.text.tertiary} value={title} onChangeText={setTitle} maxLength={120} returnKeyType="next" />

            <Text style={styles.label}>Sport</Text>
            {sportsQuery.isLoading ? <Text style={styles.hint}>Loading sports…</Text> : sportsQuery.isError ? <Text style={styles.hint}>Couldn’t load sports. Close this form and try again.</Text> : (
              <View style={styles.chips}>{sports.map((sport: Sport) => <Choice key={sport.id} label={sport.name} selected={(sportId || sports[0]?.id) === sport.id} onPress={() => setSportId(sport.id)} />)}</View>
            )}

            <Text style={styles.label}>Venue (optional)</Text>
            <Text style={styles.hint}>Choose where you plan to play, or leave this blank if you’re arranging the venue later.</Text>
            <View style={styles.chips}>
              <Choice label="Venue to be decided" selected={!venueId} onPress={() => setVenueId('')} />
              {venues.map((venue: Venue) => <Choice key={venue.id} label={venue.name} selected={venueId === venue.id} onPress={() => setVenueId(venue.id)} />)}
            </View>

            <Text style={styles.label}>Day</Text>
            <View style={styles.chips}>{dateOptions.map((date) => <Choice key={date.value} label={date.label} detail={date.detail} selected={startDate === date.value} onPress={() => setStartDate(date.value)} />)}</View>

            <Text style={styles.label}>Start time</Text>
            <View style={styles.chips}>{timeOptions.map((time) => <Choice key={time} label={time} selected={startTime === time} onPress={() => setStartTime(time)} />)}</View>
            <Text style={styles.hint}>Times use your phone’s local time.</Text>

            <Text style={styles.label}>Game length</Text>
            <View style={styles.chips}>{[60, 90, 120].map((minutes) => <Choice key={minutes} label={`${minutes} min`} selected={durationMinutes === minutes} onPress={() => setDurationMinutes(minutes)} />)}</View>

            <Text style={styles.label}>Total players, including you</Text>
            <TextInput style={styles.field} placeholder="4" placeholderTextColor={colors.text.tertiary} keyboardType="number-pad" value={players} onChangeText={setPlayers} maxLength={3} />

            <Text style={styles.label}>Cost per player</Text>
            <TextInput style={styles.field} placeholder="0" placeholderTextColor={colors.text.tertiary} keyboardType="number-pad" value={cost} onChangeText={setCost} maxLength={7} />
            <Text style={styles.hint}>Enter 0 if the game is free. Payment collection between players isn’t enabled yet.</Text>

            <Text style={styles.label}>How players join</Text>
            <View style={styles.chips}>
              <Choice label="Approve requests" selected={!instantJoin} onPress={() => setInstantJoin(false)} />
              <Choice label="Join instantly" selected={instantJoin} onPress={() => setInstantJoin(true)} />
            </View>

            <Text style={styles.label}>Who can see this game?</Text>
            <View style={styles.chips}>
              <Choice label="Public" detail="Anyone can find it" selected={!privateGame} onPress={() => setPrivateGame(false)} />
              <Choice label="Invite only" detail="Only invited Playpals" selected={privateGame} onPress={() => setPrivateGame(true)} />
            </View>

            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput style={[styles.field, { minHeight: 88, textAlignVertical: 'top' }]} placeholder="Skill level, what to bring, or other details" placeholderTextColor={colors.text.tertiary} value={notes} onChangeText={setNotes} maxLength={1000} multiline />

            <Button title={privateGame ? 'Create invite-only game' : 'Post public game'} onPress={() => create.mutate()} loading={create.isPending} disabled={create.isPending || sports.length === 0} />
            <Button title="Cancel" variant="outline" onPress={() => setShowHost(false)} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={!!requestsGame} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setRequestsGame(null)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.title}>Join requests</Text>
            <Text style={styles.subtitle}>{requestsGame?.title}</Text>
          </View>
          {participantsQuery.isLoading ? <LoadingState label="Loading requests…" /> : (
            <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}>
              <Text style={styles.sectionTitle}>Pending requests</Text>
              {(participantsQuery.data ?? []).filter((participant) => participant.status === 'REQUESTED').map((item) => (
                <View key={item.id} style={styles.requestCard}>
                  <Text style={styles.badge}>{[item.player?.firstName, item.player?.lastName].filter(Boolean).join(' ') || 'Player'}</Text>
                  {item.message ? <Text style={styles.detail}>{item.message}</Text> : null}
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}><Button title="Approve" size="sm" onPress={() => decide.mutate({ participantId: item.id, approve: true })} loading={decide.isPending} /></View>
                    <View style={{ flex: 1 }}><Button title="Decline" size="sm" variant="outline" onPress={() => decide.mutate({ participantId: item.id, approve: false })} loading={decide.isPending} /></View>
                  </View>
                </View>
              ))}
              <Text style={styles.sectionTitle}>Confirmed players</Text>
              {(participantsQuery.data ?? []).filter((participant) => participant.status === 'APPROVED' && participant.role !== 'HOST').map((item) => (
                <View key={item.id} style={styles.requestCard}>
                  <Text style={styles.badge}>{[item.player?.firstName, item.player?.lastName].filter(Boolean).join(' ') || 'Player'}{item.role === 'COHOST' ? ' · Co-host' : ''}</Text>
                  {item.role !== 'COHOST' ? <Button title="Make co-host" size="sm" variant="outline" onPress={() => appointCohost.mutate(item.id)} loading={appointCohost.isPending} /> : null}
                </View>
              ))}
            </ScrollView>
          )}
          <View style={{ padding: spacing.lg }}><Button title="Done" variant="outline" onPress={() => setRequestsGame(null)} /></View>
        </View>
      </Modal>
    </View>
  );
};

export default GamesScreen;
