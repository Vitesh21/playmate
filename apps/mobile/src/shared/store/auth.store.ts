import { create } from 'zustand';
import apiClient from '@shared/services/api';
import storage from '@shared/services/storage';
import supabase from '@shared/services/supabase';
import type { User, UserRole, ApiResponse } from '@playmate/types';

type AuthState = {
  user: User | null;
  session: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      const token = data.session?.access_token;
      if (token) {
        apiClient.setToken(token);
        await storage.setAccessToken(token);
      }

      const profileRes = await apiClient.get<ApiResponse<User>>('/auth/profile');
      const user = profileRes.data;

      if (user) {
        await storage.setUser(user);
        set({ user, isAuthenticated: true });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email: string, password: string, firstName?: string, lastName?: string) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { firstName, lastName },
        },
      });
      if (error) throw error;

      const token = data.session?.access_token;
      if (token) {
        apiClient.setToken(token);
        await storage.setAccessToken(token);
      }

      const profileRes = await apiClient.get<ApiResponse<User>>('/auth/profile');
      const user = profileRes.data;

      if (user) {
        await storage.setUser(user);
        set({ user, isAuthenticated: true });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await supabase.auth.signOut();
      apiClient.clearToken();
      await storage.clearAuth();
      set({ user: null, session: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const token = await storage.getAccessToken();
      const storedUser = await storage.getUser<User>();

      if (token && storedUser) {
        apiClient.setToken(token);
        set({ user: storedUser, session: token, isAuthenticated: true });
        return;
      }

      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (session) {
        apiClient.setToken(session.access_token);
        await storage.setAccessToken(session.access_token);

        const profileRes = await apiClient.get<ApiResponse<User>>('/auth/profile');
        const user = profileRes.data;

        if (user) {
          await storage.setUser(user);
          set({ user, isAuthenticated: true });
        }
      }
    } catch {
      await storage.clearAuth();
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (profileData: Partial<User>) => {
    set({ isLoading: true });
    try {
      const res = await apiClient.patch<ApiResponse<User>, Partial<User>>(
        `/users/${get().user?.id}`,
        profileData
      );
      const updatedUser = res.data;
      if (updatedUser) {
        await storage.setUser(updatedUser);
        set({ user: updatedUser });
      }
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useAuthStore;
