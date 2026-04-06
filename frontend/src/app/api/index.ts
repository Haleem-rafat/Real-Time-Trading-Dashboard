import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { ELocalStorageKeys } from '@constants/keys';
import { ERoutes } from '@constants/routes';

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1',
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Inject Bearer token into every request if present
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(ELocalStorageKeys.TOKEN);
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(ELocalStorageKeys.TOKEN);
      localStorage.removeItem(ELocalStorageKeys.USER);
      // Avoid infinite redirect loops on the auth pages themselves
      const path = window.location.pathname;
      if (path !== ERoutes.LOGIN && path !== ERoutes.REGISTER) {
        window.location.assign(ERoutes.LOGIN);
      }
    }
    return Promise.reject(error);
  },
);

export default api;
