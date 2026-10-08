import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';
import type { ApiError, ApiResponse } from '@playmate/types';

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

const TOKEN_KEY = 'auth_token';

class ApiClient {
  private instance: AxiosInstance;
  private token: string | null = null;

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
      this.token = await SecureStore.getItemAsync(TOKEN_KEY);
    }
    if (this.token && config.headers) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }
    return config;
  }

  private handleResponse(response: AxiosResponse) {
    return response.data;
  }

  private handleError(error: any) {
    const errorData = error.response?.data as ApiResponse<never>;
    const message =
      errorData?.error?.message ||
      error.message ||
      'Something went wrong. Please try again.';

    if (error.response?.status === 401) {
      this.clearToken();
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

  setToken(token: string) {
    this.token = token;
    SecureStore.setItemAsync(TOKEN_KEY, token);
  }

  clearToken() {
    this.token = null;
    SecureStore.deleteItemAsync(TOKEN_KEY);
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
