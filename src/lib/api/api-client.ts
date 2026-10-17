import { Platform } from 'react-native';

import { authClient, revalidateAuthSession } from '@/lib/auth/auth-client';
import { getApiBaseUrl } from '@/lib/api/base-url';

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(path: `/api/${string}`, options: ApiRequestOptions = {}) {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (Platform.OS !== 'web') {
    const cookie = authClient.getCookie();
    if (cookie) headers.set('Cookie', cookie);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: Platform.OS === 'web' ? 'include' : 'omit',
  });
  const payload = await readJson(response);

  if (!response.ok) {
    if (response.status === 401) {
      revalidateAuthSession();
    }

    const error = payload as ApiErrorBody | null;
    throw new ApiError(
      error?.error?.message ?? 'Something went wrong. Please try again.',
      response.status,
      error?.error?.code,
    );
  }

  return payload as T;
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError('The server returned an invalid response.', response.status);
  }
}
