import { ENV } from '../config/env';
import type { ApiResponse } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * ClubMgmt mobile API client.
 *
 * Auth model (React-Native specific):
 *
 * The web app keeps the user signed in via an HttpOnly `clubmgmt.refresh`
 * cookie and silently exchanges it for short-lived access tokens. React
 * Native's native HTTP stack does NOT expose `Set-Cookie` to `fetch`, and its
 * cookie jar is not reliably persisted across app restarts / reinstalls, so the
 * refresh-cookie strategy cannot work here.
 *
 * Instead we persist the JWT access token itself in AsyncStorage. The backend
 * returns `token` in the JSON body of the Google OAuth callback (delivered to
 * the app via the `clubmgmt://auth/callback?token=...` deep link). We store it,
 * restore it on cold start, and attach it as a Bearer token on every request.
 * When it eventually expires the next request 401s and we route the user back
 * to Login to re-authenticate.
 */

const API_BASE_URL = ENV.API_BASE_URL;

// ── Persisted access token ──
// Stored in AsyncStorage so the session survives app restarts, and mirrored in
// memory so requests don't await storage on the hot path.
const TOKEN_STORAGE_KEY = '@clubmgmt/access-token';

let accessToken: string | null = null;

/** Set the in-memory access token (does not touch storage). */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Read the current in-memory access token. */
export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Load the persisted access token into memory. Call once on app boot before
 * making any authenticated request. Returns the token (or null if none).
 */
export async function loadPersistedToken(): Promise<string | null> {
  try {
    accessToken = (await AsyncStorage.getItem(TOKEN_STORAGE_KEY)) ?? null;
  } catch {
    accessToken = null;
  }
  return accessToken;
}

/** Persist a fresh access token to storage and memory (login / OAuth). */
export async function persistToken(token: string): Promise<void> {
  accessToken = token;
  try {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // Storage failure is non-fatal — the in-memory token still works this run.
  }
}

/** Clear the persisted access token from storage and memory (logout / 401). */
export async function clearPersistedToken(): Promise<void> {
  accessToken = null;
  try {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore — the in-memory token is already cleared.
  }
}

// ── Unauthorized handler wiring (set by AuthProvider) ──
type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

/**
 * Registered by the AuthProvider. Called once when a request fails auth in a
 * way we cannot recover from (expired / invalid token). The handler should
 * clear user state and route back to Login.
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

// Endpoints that must never trigger the unauthorized handler on 401 — they *are*
// the auth surface, so a 401 from them is a real, expected failure (bad creds,
// no session yet, etc.) rather than an expired session mid-app.
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
  // The stored token is no longer usable — drop it so a later cold start can't
  // restore it and get stuck in a boot loop of 401s.
  void clearPersistedToken();
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

// ── Request types ──
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequestOptions {
  method?: HttpMethod;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  /** Explicit token override (used during bootstrap before state is committed). */
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
    // No silent refresh is possible on mobile — an unrecoverable 401 means the
    // token is gone/expired, so eject the user back to Login.
    if (response.status === 401 && !isAuthExempt(endpoint)) {
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
