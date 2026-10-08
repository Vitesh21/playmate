import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import apiClient from '@shared/services/api';
import type {
  Venue,
  Sport,
  Court,
  CourtSlot,
  ApiResponse,
  PaginatedResponse,
} from '@playmate/types';
import type { VenueSearchInput } from '@playmate/validation';

const VENUE_KEYS = {
  all: ['venues'] as const,
  lists: () => [...VENUE_KEYS.all, 'list'] as const,
  list: (filters: VenueSearchInput) => [...VENUE_KEYS.lists(), filters] as const,
  details: () => [...VENUE_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...VENUE_KEYS.details(), id] as const,
  courts: (venueId: string) => [...VENUE_KEYS.detail(venueId), 'courts'] as const,
  slots: (courtId: string, date: string) => [...VENUE_KEYS.all, 'slots', courtId, date] as const,
  sports: () => ['sports'] as const,
};

export function useSports(options?: Omit<UseQueryOptions<Sport[]>, 'queryKey' | 'queryFn'>) {
  return useQuery<Sport[]>({
    queryKey: VENUE_KEYS.sports(),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<PaginatedResponse<Sport>>>('/sports', {
        params: { perPage: 100 },
      });
      return res.data?.items ?? [];
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useVenues(
  filters: VenueSearchInput = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<Venue>>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedResponse<Venue>>({
    queryKey: VENUE_KEYS.list(filters),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<PaginatedResponse<Venue>>>('/venues', {
        params: filters,
      });
      return res.data ?? { items: [], total: 0, page: 1, perPage: 10, totalPages: 0 };
    },
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useVenue(
  id: string,
  options?: Omit<UseQueryOptions<Venue>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Venue>({
    queryKey: VENUE_KEYS.detail(id),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Venue>>(`/venues/${id}`);
      return res.data as Venue;
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!id,
    ...options,
  });
}

export function useVenueCourts(
  venueId: string,
  options?: Omit<UseQueryOptions<Court[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Court[]>({
    queryKey: VENUE_KEYS.courts(venueId),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<PaginatedResponse<Court>>>(
        `/courts/venue/${venueId}`,
        { params: { perPage: 100 } }
      );
      return res.data?.items ?? [];
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!venueId,
    ...options,
  });
}

export function useCourtSlots(
  courtId: string,
  date: string,
  options?: Omit<UseQueryOptions<CourtSlot[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery<CourtSlot[]>({
    queryKey: VENUE_KEYS.slots(courtId, date),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<CourtSlot[]>>(`/court-slots/court/${courtId}`, {
        params: { date },
      });
      return res.data ?? [];
    },
    staleTime: 30 * 1000,
    enabled: !!courtId && !!date,
    ...options,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { courtSlotId: string }) => {
      const res = await apiClient.post<
        ApiResponse<{ bookingId: string; paymentId: string; totalAmount: number }>,
        { courtSlotId: string }
      >('/bookings', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...VENUE_KEYS.all, 'slots'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

export { VENUE_KEYS };
