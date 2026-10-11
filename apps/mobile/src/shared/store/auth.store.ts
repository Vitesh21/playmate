import { create } from 'zustand';
import apiClient from '@shared/services/api';
import storage from '@shared/services/storage';
import type { User, ApiResponse } from '@playmate/types';
import { UserRole } from '@playmate/types';

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

/**
 * Minimal mapping from a Supabase-style user object (returned by /auth/signup,
 * /auth/login and /auth/me) into the shared Playmate `User` type.
 */
function mapUser(src: any): User | null {
  if (!src) return null;
  const meta = src.user_metadata ?? {};
  return {
    id: src.id,
    email: src.email ?? '',
    firstName: src.firstName ?? meta?.firstName ?? null,
    lastName: src.lastName ?? meta?.lastName ?? null,
    phone: src.phone ?? meta?.phone ?? null,
    avatarUrl: src.avatarUrl ?? src.avatar_url ?? meta?.avatarUrl ?? null,
    role: (src.role as UserRole) ?? UserRole.USER,
    createdAt: src.createdAt ?? src.created_at ?? new Date(),
    updatedAt: src.updatedAt ?? src.updated_at ?? new Date(),
  } as User;
}

async function runAndRestore(fn: () => Promise<void>) {
  await fn();
  // Refresh the stored user profile from /auth/me so the session is always in sync.
  try {
    const res = await apiClient.get<ApiResponse<{ user: any }>>('/auth/me');
    return mapUser(res.data?.user);
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const res = await apiClient.post<ApiResponse<any>>('/auth/login', { email, password });
      const token = res.data?.session?.access_token;
      if (!token) throw new Error('No session returned from login');

      apiClient.setToken(token);
      await storage.setAccessToken(token);

      const user = mapUser(res.data?.user);
      if (user) {
        await storage.setUser(user);
        set({ user, session: token, isAuthenticated: true });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email: string, password: string, firstName?: string, lastName?: string) => {
    set({ isLoading: true });
    try {
      const res = await apiClient.post<ApiResponse<any>>('/auth/signup', {
        email,
        password,
        firstName,
        lastName,
      });
      if (!res.success) throw new Error(res.error?.message || 'Sign up failed');

      // Server-side signUp returns a user but no session; log in to obtain one.
      const loginRes = await apiClient.post<ApiResponse<any>>('/auth/login', { email, password });
      const token = loginRes.data?.session?.access_token;
      if (!token) throw new Error('No session returned after sign up');

      apiClient.setToken(token);
      await storage.setAccessToken(token);

      const user = mapUser(loginRes.data?.user);
      if (user) {
        await storage.setUser(user);
        set({ user, session: token, isAuthenticated: true });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      const token = get().session ?? (await storage.getAccessToken());
      apiClient.clearToken();
      await storage.clearAuth();
      // Best-effort server-side sign out; ignore failures (token already cleared locally).
      if (token) {
        try {
          await apiClient.post('/auth/logout');
        } catch {
          /* ignore */
        }
      }
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

      if (token) {
        apiClient.setToken(token);
        const user = await runAndRestore(async () => {});
        if (user) {
          await storage.setUser(user);
          set({ user, session: token, isAuthenticated: true });
        } else {
          await storage.clearAuth();
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