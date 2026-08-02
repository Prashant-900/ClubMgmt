import { ENV } from '../config/env';
import type { ApiResponse } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * ClubMgmt mobile API client.
 *
 * Mirrors the web client (frontend/lib/api/client.ts) so the request/refresh
 * contract stays identical, with React-Native-specific adaptations:
 *
 *  1. There is no `window` / router at module scope, so instead of
 *     `window.location.replace("/login")` on an unrecoverable 401 we invoke a
 *     callback that the AuthProvider registers via `setUnauthorizedHandler`.
 *  2. The web relies on the browser's cookie store for the HttpOnly
 *     `clubmgmt.refresh` cookie. React Native's native cookie jar is NOT
 *     reliably persisted across app restarts (and is cleared on reinstall), so
 *     we persist that one cookie ourselves in AsyncStorage: we capture it from
 *     `Set-Cookie` on every response and replay it as a `Cookie` header on every
 *     request. This is what keeps the user signed in between launches.
 */

const API_BASE_URL = ENV.API_BASE_URL;

// ── Persistent refresh cookie (mirrors the web HttpOnly cookie) ──
const REFRESH_COOKIE_NAME = 'clubmgmt.refresh';
const REFRESH_STORAGE_KEY = '@clubmgmt/refresh-cookie';

// Cached in memory so requests don't await AsyncStorage on the hot path; kept in
// sync with storage. `undefined` = not loaded yet, `null` = known-absent.
let refreshCookieValue: string | null | undefined = undefined;

/** Load the persisted refresh cookie into memory (call once on boot). */
export async function loadPersistedRefreshCookie(): Promise<void> {
  try {
    refreshCookieValue = (await AsyncStorage.getItem(REFRESH_STORAGE_KEY)) ?? null;
  } catch {
    refreshCookieValue = null;
  }
}

async function persistRefreshCookie(value: string | null): Promise<void> {
  refreshCookieValue = value;
  try {
    if (value) {
      await AsyncStorage.setItem(REFRESH_STORAGE_KEY, value);
    } else {
      await AsyncStorage.removeItem(REFRESH_STORAGE_KEY);
    }
  } catch {
    // Storage failure is non-fatal — the in-memory value still works this run.
  }
}

/** Extract & persist the refresh cookie from a response's Set-Cookie header. */
function captureRefreshCookie(response: Response): void {
  // RN merges multiple Set-Cookie headers into one comma-joined string.
  const raw =
    response.headers.get('set-cookie') ?? response.headers.get('Set-Cookie');
  if (!raw) return;

  // Find the `clubmgmt.refresh=...` pair anywhere in the (possibly merged) value.
  const match = raw.match(new RegExp(`${REFRESH_COOKIE_NAME}=([^;,]+)`));
  if (!match) return;

  const value = match[1];
  // An explicit clear (empty value / Max-Age=0 / expired) removes it.
  const cleared =
    value === '' ||
    /Max-Age=0/i.test(raw) ||
    /expires=Thu, 01 Jan 1970/i.test(raw);
  void persistRefreshCookie(cleared ? null : `${REFRESH_COOKIE_NAME}=${value}`);
}

/** Clear the persisted refresh cookie (on logout / unrecoverable 401). */
export async function clearPersistedRefreshCookie(): Promise<void> {
  await persistRefreshCookie(null);
}

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

  // Replay the persisted refresh cookie so the native cookie jar doesn't need
  // to survive restarts. Only sent for the auth endpoints that use it.
  if (refreshCookieValue && endpoint.startsWith('/auth/')) {
    requestHeaders.Cookie = refreshCookieValue;
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

  // Capture + persist any refresh-cookie rotation before anything else.
  captureRefreshCookie(response);

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
