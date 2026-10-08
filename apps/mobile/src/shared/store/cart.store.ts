import { create } from 'zustand';
import type { Cart, CartItem, ProductVariant, ApiResponse } from '@playmate/types';
import apiClient from '@shared/services/api';

type CartState = {
  cart: Cart | null;
  items: CartItem[];
  variants: Record<string, ProductVariant>;
  isLoading: boolean;
  fetchCart: () => Promise<void>;
  addItem: (variantId: string, quantity: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => void;
  getSubtotal: () => number;
  getItemCount: () => number;
};

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  items: [],
  variants: {},
  isLoading: false,

  fetchCart: async () => {
    set({ isLoading: true });
    try {
      const res = await apiClient.get<ApiResponse<{ cart: Cart; items: (CartItem & { variant: ProductVariant })[] }>>(
        '/cart'
      );
      if (res.data) {
        const variantMap: Record<string, ProductVariant> = {};
        res.data.items.forEach((item) => {
          variantMap[(item as any).variant.id] = (item as any).variant;
        });
        const cleanItems = res.data.items.map((item) => {
          const { variant, ...rest } = item as any;
          return rest as CartItem;
        });
        set({ cart: res.data.cart, items: cleanItems, variants: variantMap });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (variantId: string, quantity: number) => {
    set({ isLoading: true });
    try {
      await apiClient.post<ApiResponse<CartItem>, { variantId: string; quantity: number }>(
        '/cart/items',
        { variantId, quantity }
      );
      await get().fetchCart();
    } finally {
      set({ isLoading: false });
    }
  },

  updateItem: async (itemId: string, quantity: number) => {
    set({ isLoading: true });
    try {
      await apiClient.patch<ApiResponse<CartItem>, { quantity: number }>(
        `/cart/items/${itemId}`,
        { quantity }
      );
      await get().fetchCart();
    } finally {
      set({ isLoading: false });
    }
  },

  removeItem: async (itemId: string) => {
    set({ isLoading: true });
    try {
      await apiClient.delete<ApiResponse<void>>(`/cart/items/${itemId}`);
      await get().fetchCart();
    } finally {
      set({ isLoading: false });
    }
  },

  clearCart: () => {
    set({ cart: null, items: [], variants: {} });
  },

  getSubtotal: () => {
    const { items, variants } = get();
    return items.reduce((total, item) => {
      const variant = variants[item.variantId];
      return total + (variant ? variant.price * item.quantity : 0);
    }, 0);
  },

  getItemCount: () => {
    return get().items.reduce((count, item) => count + item.quantity, 0);
  },
}));

export default useCartStore;
