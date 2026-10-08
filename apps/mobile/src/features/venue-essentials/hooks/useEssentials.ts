import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import apiClient from '@shared/services/api';
import type {
  VenueEssential,
  BookingEssential,
  EssentialRecommendation,
  OnDemandOrder,
  OnDemandOrderItem,
  ApiResponse,
  PaginatedResponse,
  EssentialType,
  EssentialPricingModel,
  PaginationParams,
} from '@playmate/types';

const ESSENTIAL_KEYS = {
  all: ['venue-essentials'] as const,
  lists: () => [...ESSENTIAL_KEYS.all, 'list'] as const,
  list: (venueId: string, filters: { sportId?: string; type?: EssentialType; category?: string }) =>
    [...ESSENTIAL_KEYS.lists(), venueId, filters] as const,
  details: () => [...ESSENTIAL_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...ESSENTIAL_KEYS.details(), id] as const,
  recs: (venueId: string, courtId?: string) => [...ESSENTIAL_KEYS.all, 'recs', venueId, courtId] as const,
  bookingLines: (bookingId: string) => ['booking-essentials', bookingId] as const,
  onDemandList: (bookingId: string) => ['on-demand', bookingId, 'list'] as const,
  onDemandDetail: (orderId: string) => ['on-demand', orderId] as const,
};

export function useVenueEssentials(
  venueId: string,
  filters: { sportId?: string; type?: EssentialType; category?: string; page?: number; perPage?: number } = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<VenueEssential>>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedResponse<VenueEssential>>({
    queryKey: ESSENTIAL_KEYS.list(venueId, filters),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<PaginatedResponse<VenueEssential>>>(
        `/venue-essentials/venue/${venueId}`,
        { params: filters }
      );
      return (
        res.data ?? { items: [], total: 0, page: filters.page ?? 1, perPage: filters.perPage ?? 20, totalPages: 0 }
      );
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!venueId,
    ...options,
  });
}

export function useEssential(
  id: string,
  options?: Omit<UseQueryOptions<VenueEssential>, 'queryKey' | 'queryFn'>
) {
  return useQuery<VenueEssential>({
    queryKey: ESSENTIAL_KEYS.detail(id),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<VenueEssential>>(`/venue-essentials/${id}`);
      return res.data as VenueEssential;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
    ...options,
  });
}

export function useEssentialRecommendations(venueId: string, courtId?: string) {
  return useQuery<EssentialRecommendation[]>({
    queryKey: ESSENTIAL_KEYS.recs(venueId, courtId),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<EssentialRecommendation[]>>(
        `/venue-essentials/venue/${venueId}/recommend`,
        { params: courtId ? { courtId } : undefined }
      );
      return res.data ?? [];
    },
    staleTime: 60 * 1000,
    enabled: !!venueId,
  });
}

export function useBookingEssentials(bookingId: string) {
  return useQuery<BookingEssential[]>({
    queryKey: ESSENTIAL_KEYS.bookingLines(bookingId),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<BookingEssential[]>>(
        `/bookings/${bookingId}/essentials`
      );
      return res.data ?? [];
    },
    staleTime: 30 * 1000,
    enabled: !!bookingId,
  });
}

export type AttachEssentialsInput = {
  bookingId: string;
  items: Array<{
    essentialId: string;
    quantity: number;
    durationHours?: number;
  }>;
};

export function useAttachEssentialsToBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AttachEssentialsInput) => {
      const res = await apiClient.post<
        ApiResponse<{ bookingEssentials: BookingEssential[]; addedTotal: number }>,
        AttachEssentialsInput
      >(`/bookings/${input.bookingId}/essentials`, input);
      return res.data;
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ESSENTIAL_KEYS.bookingLines(input.bookingId) });
      qc.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

export type OnDemandCreateInput = {
  bookingId: string;
  items: Array<{ essentialId: string; quantity: number }>;
  deliveryNote?: string;
};

export function useCreateOnDemandOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: OnDemandCreateInput) => {
      const res = await apiClient.post<
        ApiResponse<{ order: OnDemandOrder; items: OnDemandOrderItem[]; totalAmount: number }>,
        OnDemandCreateInput
      >('/on-demand-orders', input);
      return res.data;
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ESSENTIAL_KEYS.onDemandList(input.bookingId) });
    },
  });
}

export function useOnDemandOrders(bookingId: string) {
  return useQuery<OnDemandOrder[]>({
    queryKey: ESSENTIAL_KEYS.onDemandList(bookingId),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<PaginatedResponse<OnDemandOrder>>>(
        `/on-demand-orders/booking/${bookingId}`,
        { params: { perPage: 100 } }
      );
      return res.data?.items ?? [];
    },
    staleTime: 15 * 1000,
    enabled: !!bookingId,
  });
}

export { ESSENTIAL_KEYS };
