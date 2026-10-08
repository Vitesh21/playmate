import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import apiClient from '@shared/services/api';
import type {
  Booking,
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
} from '@playmate/types';

const BOOKING_KEYS = {
  all: ['bookings'] as const,
  lists: () => [...BOOKING_KEYS.all, 'list'] as const,
  list: (filters: PaginationParams) => [...BOOKING_KEYS.lists(), filters] as const,
  details: () => [...BOOKING_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...BOOKING_KEYS.details(), id] as const,
};

export function useBookings(
  filters: PaginationParams = { page: 1, perPage: 20 },
  options?: Omit<UseQueryOptions<PaginatedResponse<Booking>>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedResponse<Booking>>({
    queryKey: BOOKING_KEYS.list(filters),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<PaginatedResponse<Booking>>>('/bookings', {
        params: filters,
      });
      return res.data ?? { items: [], total: 0, page: 1, perPage: 20, totalPages: 0 };
    },
    staleTime: 30 * 1000,
    ...options,
  });
}

export function useBooking(
  id: string,
  options?: Omit<UseQueryOptions<Booking>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Booking>({
    queryKey: BOOKING_KEYS.detail(id),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Booking>>(`/bookings/${id}`);
      return res.data as Booking;
    },
    staleTime: 60 * 1000,
    enabled: !!id,
    ...options,
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await apiClient.post<ApiResponse<Booking>>(`/bookings/${bookingId}/cancel`);
      return res.data;
    },
    onSuccess: (_data, bookingId) => {
      queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.detail(bookingId) });
      queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.lists() });
    },
  });
}

export { BOOKING_KEYS };
