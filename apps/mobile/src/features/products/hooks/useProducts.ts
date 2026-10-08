import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import apiClient from '@shared/services/api';
import type {
  Product,
  Category,
  ProductVariant,
  ApiResponse,
  PaginatedResponse,
  ProductSearchInput,
} from '@playmate/types';

const PRODUCT_KEYS = {
  all: ['products'] as const,
  lists: () => [...PRODUCT_KEYS.all, 'list'] as const,
  list: (filters: ProductSearchInput) => [...PRODUCT_KEYS.lists(), filters] as const,
  details: () => [...PRODUCT_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...PRODUCT_KEYS.details(), id] as const,
  variants: (productId: string) => [...PRODUCT_KEYS.detail(productId), 'variants'] as const,
  categories: () => ['categories'] as const,
  categoryTree: () => ['categories', 'tree'] as const,
};

export function useCategories(options?: Omit<UseQueryOptions<Category[]>, 'queryKey' | 'queryFn'>) {
  return useQuery<Category[]>({
    queryKey: PRODUCT_KEYS.categories(),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<PaginatedResponse<Category>>>('/categories', {
        params: { perPage: 100 },
      });
      return res.data?.items ?? [];
    },
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

export function useProducts(
  filters: ProductSearchInput = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<Product>>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedResponse<Product>>({
    queryKey: PRODUCT_KEYS.list(filters),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<PaginatedResponse<Product>>>('/products', {
        params: filters,
      });
      return res.data ?? { items: [], total: 0, page: 1, perPage: 10, totalPages: 0 };
    },
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useProduct(
  id: string,
  options?: Omit<UseQueryOptions<Product>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Product>({
    queryKey: PRODUCT_KEYS.detail(id),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Product>>(`/products/${id}`);
      return res.data as Product;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
    ...options,
  });
}

export function useProductVariants(
  productId: string,
  options?: Omit<UseQueryOptions<ProductVariant[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ProductVariant[]>({
    queryKey: PRODUCT_KEYS.variants(productId),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ProductVariant[]>>(
        `/product-variants/product/${productId}`
      );
      return res.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!productId,
    ...options,
  });
}

export { PRODUCT_KEYS };
