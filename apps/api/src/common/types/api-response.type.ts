export interface ApiError {
  code: string;
  message: string;
  userMessage?: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T | null;
  error?: ApiError | null;
  meta?: Record<string, unknown> | null;
}
