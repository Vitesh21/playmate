import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import Toast from 'react-native-toast-message';
import storage from '@shared/services/storage';
import type { ApiError } from '@playmate/types';

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

// NOTE: token persisted via storage service (SecureStore on native,
// localStorage on web) so API auth works across platforms.
const TOKEN_KEY = 'auth_token';

class ApiClient {
  private instance: AxiosInstance;
  private token: string | null = null;
  private refreshInFlight: Promise<string | null> | null = null;
  private onAuthExpired?: () => void;

  constructor() {
    this.instance = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.instance.interceptors.request.use(this.handleRequest.bind(this) as any);
    this.instance.interceptors.response.use(
      this.handleResponse.bind(this),
      this.handleError.bind(this)
    );
  }

  private async handleRequest(config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> {
    if (!this.token) {
      this.token = await storage.getItem(TOKEN_KEY);
    }
    if (this.token && config.headers) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }
    return config;
  }

  private handleResponse(response: AxiosResponse) {
    return response.data;
  }

  private async handleError(error: any) {
    const errorData = error.response?.data as any;
    const request = error.config as (InternalAxiosRequestConfig & { _playmateRetried?: boolean }) | undefined;
    const validationMessage = Array.isArray(errorData?.errors)
      ? errorData.errors[0]?.message
      : undefined;
    const message =
      errorData?.error?.message ||
      errorData?.message ||
      validationMessage ||
      error.message ||
      'Something went wrong. Please try again.';

    const authEndpoint = /\/auth\/(login|signup|refresh)$/.test(request?.url ?? '');
    if (error.response?.status === 401 && request && !request._playmateRetried && !authEndpoint) {
      request._playmateRetried = true;
      const freshToken = await this.refreshAccessToken();
      if (freshToken) {
        request.headers.Authorization = `Bearer ${freshToken}`;
        return this.instance.request(request);
      }
    }

    if (error.response?.status === 401) {
      this.clearToken();
      await storage.clearAuth();
      if (!/\/auth\/(login|signup)$/.test(request?.url ?? '')) this.onAuthExpired?.();
      Toast.show({
        type: 'error',
        text1: 'Session Expired',
        text2: 'Please sign in to book courts and access account features.',
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: message,
      });
    }

    return Promise.reject({
      code: errorData?.error?.code || 'UNKNOWN_ERROR',
      message,
      details: errorData?.error?.details,
      status: error.response?.status,
    } as ApiError & { status?: number });
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = (async () => {
        const refreshToken = await storage.getRefreshToken();
        if (!refreshToken) return null;
        const response = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken }, { timeout: 30000 });
        const session = response.data?.data?.session;
        const accessToken = session?.access_token;
        if (!accessToken || !session?.refresh_token) return null;
        this.token = accessToken;
        await Promise.all([
          storage.setAccessToken(accessToken),
          storage.setRefreshToken(session.refresh_token),
        ]);
        return accessToken;
      })().catch(() => null).finally(() => {
        this.refreshInFlight = null;
      });
    }
    return this.refreshInFlight;
  }

  setToken(token: string) {
    this.token = token;
    storage.setItem(TOKEN_KEY, token);
  }

  setOnAuthExpired(handler: () => void) {
    this.onAuthExpired = handler;
  }

  clearToken() {
    this.token = null;
    storage.removeItem(TOKEN_KEY);
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.get(url, config) as unknown as Promise<T>;
  }

  async post<T, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.instance.post(url, data, config) as unknown as Promise<T>;
  }

  async put<T, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.instance.put(url, data, config) as unknown as Promise<T>;
  }

  async patch<T, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.instance.patch(url, data, config) as unknown as Promise<T>;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.delete(url, config) as unknown as Promise<T>;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
