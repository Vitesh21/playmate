import React, { useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@shared/services/api';
import { useTheme } from '@theme/index';
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState } from '@components/ui';

type Player = { id: string; firstName?: string | null; lastName?: string | null; avatarUrl?: string | null };
type FriendRequest = { id: string; player?: Player };
type Envelope<T> = { data: T };

export default function PlaypalsScreen() {
  const { colors, spacing, typography } = useTheme();
  const client = useQueryClient();
  const [email, setEmail] = useState('');
  const friends = useQuery({ queryKey: ['friends'], queryFn: () => apiClient.get<Envelope<Player[]>>('/friends').then((res) => res.data ?? []) });
  const requests = useQuery({ queryKey: ['friends', 'requests'], queryFn: () => apiClient.get<Envelope<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>>('/friends/requests').then((res) => res.data) });
  const refresh = () => { void friends.refetch(); void requests.refetch(); };
  const invalidate = () => { void client.invalidateQueries({ queryKey: ['friends'] }); };
  const send = useMutation({
    mutationFn: () => apiClient.post('/friends/requests', { email: email.trim() }),
    onSuccess: () => { setEmail(''); invalidate(); Alert.alert('Request sent', 'Your playpal request is on its way.'); },
    onError: (error: any) => Alert.alert('Could not send request', error?.message ?? 'Check the email and try again.'),
  });
  const decide = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) => apiClient.patch(`/friends/requests/${id}`, { accept }),
    onSuccess: invalidate,
    onError: (error: any) => Alert.alert('Could not update request', error?.message ?? 'Please try again.'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/friends/${id}`),
    onSuccess: invalidate,
    onError: (error: any) => Alert.alert('Could not remove playpal', error?.message ?? 'Please try again.'),
  });
  const name = (player?: Player) => [player?.firstName, player?.lastName].filter(Boolean).join(' ') || 'Playmate player';
  const styles = StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.background.screen },
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
    title: { ...typography.h3, color: colors.text.primary },
    subtitle: { ...typography.body2, color: colors.text.secondary, lineHeight: 21 },
    input: { minHeight: 48, borderWidth: 1, borderColor: colors.border.medium, borderRadius: 12, backgroundColor: colors.background.primary, color: colors.text.primary, paddingHorizontal: spacing.md, ...typography.body1 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    playerName: { ...typography.subtitle2, color: colors.text.primary, flex: 1 },
    actions: { flexDirection: 'row', gap: spacing.xs },
    section: { ...typography.h5, color: colors.text.primary, marginTop: spacing.md },
  });
  if (friends.isLoading) return <LoadingState label="Loading your playpals…" />;
  if (friends.isError) return <ErrorState title="Could not load playpals" description="Check your connection and try again." action={<Button title="Retry" variant="outline" onPress={refresh} />} />;
  return (
    <FlatList
      style={styles.page}
      contentContainerStyle={styles.content}
      data={friends.data ?? []}
      keyExtractor={(player) => player.id}
      refreshControl={<RefreshControl refreshing={friends.isRefetching || requests.isRefetching} onRefresh={refresh} />}
      ListHeaderComponent={(
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.title}>Your playpals</Text>
          <Text style={styles.subtitle}>Build your crew. Email addresses stay private and are only used to find the account you invite.</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Friend’s account email" placeholderTextColor={colors.text.tertiary} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} returnKeyType="send" onSubmitEditing={() => send.mutate()} />
          <Button title="Send playpal request" onPress={() => send.mutate()} loading={send.isPending} disabled={!email.trim()} />
          <Text style={styles.section}>Incoming requests · {requests.data?.incoming.length ?? 0}</Text>
          {(requests.data?.incoming ?? []).length === 0 ? <Text style={styles.subtitle}>No new requests.</Text> : (requests.data?.incoming ?? []).map((item) => (
            <Card key={item.id} padding="md"><View style={styles.row}><Text style={styles.playerName}>{name(item.player)}</Text><View style={styles.actions}><Button title="Accept" size="sm" onPress={() => decide.mutate({ id: item.id, accept: true })} /><Button title="Decline" size="sm" variant="outline" onPress={() => decide.mutate({ id: item.id, accept: false })} /></View></View></Card>
          ))}
          <Text style={styles.section}>Sent requests · {requests.data?.outgoing.length ?? 0}</Text>
          {(requests.data?.outgoing ?? []).length === 0 ? <Text style={styles.subtitle}>No pending outgoing requests.</Text> : (requests.data?.outgoing ?? []).map((item) => <Card key={item.id} padding="md"><View style={styles.row}><Text style={styles.playerName}>{name(item.player)}</Text><Badge label="Pending" variant="warning" /></View></Card>)}
          <Text style={styles.section}>Playpals · {friends.data?.length ?? 0}</Text>
        </View>
      )}
      renderItem={({ item }) => <Card padding="md"><View style={styles.row}><Text style={styles.playerName}>{name(item)}</Text><Button title="Remove" size="sm" variant="outline" onPress={() => Alert.alert('Remove playpal?', `Remove ${name(item)} from your playpals?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => remove.mutate(item.id) }])} /></View></Card>}
      ListEmptyComponent={<EmptyState title="Your crew starts here" description="Send a request to someone you have played with or invite a friend by email." />}
    />
  );
}
