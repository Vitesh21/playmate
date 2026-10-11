import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const USER_KEY = 'auth_user';

/**
 * SecureStore is not available on web. Fall back to localStorage so web
 * previews (Expo web) still work while native uses encrypted storage.
 */
const isWeb = Platform.OS === 'web';

const webStore: Record<string, string> = {};

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return webStore[key] ?? localStorage.getItem(key);
    } catch {
      return webStore[key] ?? null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    webStore[key] = value;
    try {
      localStorage.setItem(key, value);
    } catch {
      /* memory-only fallback */
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    delete webStore[key];
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const storage = {
  async getAccessToken(): Promise<string | null> {
    return getItem(ACCESS_TOKEN_KEY);
  },

  async setAccessToken(token: string): Promise<void> {
    await setItem(ACCESS_TOKEN_KEY, token);
  },

  async getRefreshToken(): Promise<string | null> {
    return getItem(REFRESH_TOKEN_KEY);
  },

  async setRefreshToken(token: string): Promise<void> {
    await setItem(REFRESH_TOKEN_KEY, token);
  },

  async getUser<T>(): Promise<T | null> {
    const user = await getItem(USER_KEY);
    return user ? (JSON.parse(user) as T) : null;
  },

  async setUser<T>(user: T): Promise<void> {
    await setItem(USER_KEY, JSON.stringify(user));
  },

  async clearAuth(): Promise<void> {
    await Promise.all([
      deleteItem(ACCESS_TOKEN_KEY),
      deleteItem(REFRESH_TOKEN_KEY),
      deleteItem(USER_KEY),
    ]);
  },

  async setItem(key: string, value: string): Promise<void> {
    await setItem(key, value);
  },

  async getItem(key: string): Promise<string | null> {
    return getItem(key);
  },

  async removeItem(key: string): Promise<void> {
    await deleteItem(key);
  },
} as const;

export type Storage = typeof storage;
export default storage;
