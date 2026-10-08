import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import apiClient from '@shared/services/api';
import type {
  Order,
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
} from '@playmate/types';
import type { CheckoutInput } from '@playmate/validation';

const ORDER_KEYS = {
  all: ['orders'] as const,
  lists: () => [...ORDER_KEYS.all, 'list'] as const,
  list: (filters: PaginationParams) => [...ORDER_KEYS.lists(), filters] as const,
  details: () => [...ORDER_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...ORDER_KEYS.details(), id] as const,
};

export function useOrders(
  filters: PaginationParams = { page: 1, perPage: 20 },
  options?: Omit<UseQueryOptions<PaginatedResponse<Order>>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedResponse<Order>>({
    queryKey: ORDER_KEYS.list(filters),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<PaginatedResponse<Order>>>('/orders', {
        params: filters,
      });
      return res.data ?? { items: [], total: 0, page: 1, perPage: 20, totalPages: 0 };
    },
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useOrder(
  id: string,
  options?: Omit<UseQueryOptions<Order>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Order>({
    queryKey: ORDER_KEYS.detail(id),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Order>>(`/orders/${id}`);
      return res.data as Order;
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!id,
    ...options,
  });
}

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CheckoutInput) => {
      const res = await apiClient.post<
        ApiResponse<{ orderId: string; paymentId: string; totalAmount: number }>,
        CheckoutInput
      >('/orders/checkout', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ORDER_KEYS.lists() });
    },
  });
}

export { ORDER_KEYS };
