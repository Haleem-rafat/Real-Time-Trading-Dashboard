export interface IApiResponse<T> {
  message: string;
  data: T;
}

export interface IApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
  path?: string;
  timestamp?: string;
}
