import { ENV } from '../config/env';
import type { ApiResponse } from '../types';

/**
 * ClubMgmt mobile API client.
 *
 * Mirrors the web client (frontend/lib/api/client.ts) so the request/refresh
 * contract stays identical, with two React-Native-specific adaptations:
 *
 *  1. There is no `window` / router at module scope, so instead of
 *     `window.location.replace("/login")` on an unrecoverable 401 we invoke a
 *     callback that the AuthProvider registers via `setUnauthorizedHandler`.
 *  2. Cookies are handled automatically by the native HTTP stack's persistent
 *     cookie jar, so the web's `credentials: "include"` is unnecessary — the
 *     HttpOnly `clubmgmt.refresh` cookie rides along on every request on its own.
 */

const API_BASE_URL = ENV.API_BASE_URL;

// ── In-memory access token (never persisted to disk / AsyncStorage) ──
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// ── Unauthorized handler wiring (set by AuthProvider) ──
type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

/**
 * Registered by the AuthProvider. Called once when a request fails auth in a
 * way we cannot silently recover from (refresh failed / no session). The
 * handler should clear user state and route back to Login.
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

// Endpoints that must never trigger a refresh/redirect on 401 — they *are* the
// auth surface, so a 401 from them is a real, expected failure (bad creds etc.).
const AUTH_EXEMPT_PREFIXES = [
  '/auth/login',
  '/auth/register',
  '/auth/google',
  '/auth/refresh',
  '/auth/logout',
];

function isAuthExempt(endpoint: string): boolean {
  return AUTH_EXEMPT_PREFIXES.some(prefix => endpoint.startsWith(prefix));
}

// Guard so a burst of concurrent 401s only fires the unauthorized handler once.
let isHandlingUnauthorized = false;

function handleUnauthorized(endpoint: string): void {
  if (isAuthExempt(endpoint)) {
    return;
  }
  accessToken = null;
  if (isHandlingUnauthorized) {
    return;
  }
  isHandlingUnauthorized = true;
  try {
    unauthorizedHandler?.();
  } finally {
    // Release on the next tick so a single failed navigation cycle collapses
    // multiple simultaneous 401s but future genuine failures still fire.
    setTimeout(() => {
      isHandlingUnauthorized = false;
    }, 0);
  }
}

// ── Silent refresh (de-duplicated) ──
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  // Collapse concurrent refreshes into a single in-flight request.
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const res = await apiRequest<{ token: string }>('/auth/refresh', {
        method: 'POST',
      });
      const newToken = res.data?.token ?? null;
      accessToken = newToken;
      return newToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ── Request types ──
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequestOptions {
  method?: HttpMethod;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  /** Explicit token override (used internally for the post-refresh retry). */
  token?: string | null;
}

export interface ApiError {
  success: false;
  message: string;
  status?: number;
}

// ── Core request ──
export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
  isRetry = false,
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, headers = {}, token } = options;

  const effectiveToken = token !== undefined ? token : accessToken;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (effectiveToken) {
    requestHeaders.Authorization = `Bearer ${effectiveToken}`;
  }

  const fetchOptions: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, fetchOptions);
  } catch (err) {
    // Network / connectivity failure — never an auth issue.
    const message =
      err instanceof Error ? err.message : 'Network request failed';
    throw { success: false, message } as ApiError;
  }

  // Some endpoints (e.g. logout) may return an empty body.
  let data: (ApiResponse<T> & { message?: string }) | null = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !isAuthExempt(endpoint) && !isRetry) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        // Retry exactly once with the freshly minted token.
        return apiRequest<T>(
          endpoint,
          { ...options, token: newToken },
          true,
        );
      }
      handleUnauthorized(endpoint);
    }

    throw {
      success: false,
      message: data?.message || `Request failed with status ${response.status}`,
      status: response.status,
    } as ApiError;
  }

  return (data ?? { success: true }) as ApiResponse<T>;
}
