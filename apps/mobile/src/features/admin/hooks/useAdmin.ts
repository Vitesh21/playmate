import { useMutation, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import apiClient from '@shared/services/api';
import type { ApiResponse, User } from '@playmate/types';

const ADMIN_KEYS = {
  all: ['admin'] as const,
  stats: () => [...ADMIN_KEYS.all, 'stats'] as const,
  users: () => [...ADMIN_KEYS.all, 'users'] as const,
  venues: () => [...ADMIN_KEYS.all, 'venues'] as const,
  pendingVenues: () => [...ADMIN_KEYS.all, 'pendingVenues'] as const,
};

export type AdminStats = {
  users: { total: number };
  sports: { total: number };
  venues: { total: number };
  activeUsers30d: number;
  bookings: { total: number; confirmedSlots: number };
  revenue: { gmv: number; refunds: number; net: number; bookingGmv: number; bookingNet: number; shopGmv: number; shopNet: number };
  occupancy: { availableSlots: number; confirmedSlots: number; fillRatePercent: number };
  repeatCustomers: number;
};

/** Dashboard counters — GET /admin/stats (ADMIN only). */
export function useAdminStats(options?: Omit<UseQueryOptions<AdminStats>, 'queryKey' | 'queryFn'>) {
  return useQuery<AdminStats>({
    queryKey: ADMIN_KEYS.stats(),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<AdminStats>>('/admin/stats');
      return res.data as AdminStats;
    },
    ...options,
  });
}

/** Every user — GET /admin/users (ADMIN only). */
export function useAdminUsers(options?: Omit<UseQueryOptions<User[]>, 'queryKey' | 'queryFn'>) {
  return useQuery<User[]>({
    queryKey: ADMIN_KEYS.users(),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<User[]>>('/admin/users');
      return res.data ?? [];
    },
    ...options,
  });
}

/** Every venue — GET /admin/venues (ADMIN only). */
export function useAdminVenues(options?: Omit<UseQueryOptions<any[]>, 'queryKey' | 'queryFn'>) {
  return useQuery<any[]>({
    queryKey: ADMIN_KEYS.venues(),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<{ items: any[] }>>('/admin/venues');
      return res.data?.items ?? [];
    },
    ...options,
  });
}

export type PendingVenue = { id: string; name: string; city: string; state: string; address: string };

export function usePendingVenues() {
  return useQuery<PendingVenue[]>({
    queryKey: ADMIN_KEYS.pendingVenues(),
    queryFn: async () => (await apiClient.get<ApiResponse<PendingVenue[]>>('/admin/venues/pending')).data ?? [],
  });
}

export function useVerifyVenue() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) =>
      apiClient.patch(`/admin/venues/${id}/verification`, { status }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ADMIN_KEYS.pendingVenues() });
      void client.invalidateQueries({ queryKey: ADMIN_KEYS.venues() });
      void client.invalidateQueries({ queryKey: ADMIN_KEYS.stats() });
    },
  });
}

export { ADMIN_KEYS };
