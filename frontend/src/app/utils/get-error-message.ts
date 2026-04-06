import { AxiosError } from 'axios';
import type { IApiError } from '../api/types/api.types';

/**
 * Extracts a human-readable message from any error shape we expect:
 * - Axios errors with our backend's IApiError envelope
 * - Plain Error
 * - Anything else
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as IApiError | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message[0] : data.message;
    }
    return err.message || 'Network error';
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}
