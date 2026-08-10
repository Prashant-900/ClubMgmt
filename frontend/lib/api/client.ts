/**
 * Centralized API client for making requests to the backend.
 * All API modules should use this client instead of calling fetch directly.
 *
 * Auth model (C-04): the short-lived access token lives ONLY in memory — never
 * in localStorage, so an XSS payload can't read it. The long-lived credential is
 * the HttpOnly `gdg.refresh` cookie, which JS can't touch. Every request is
 * sent with `credentials: "include"` so that cookie rides along. When a call
 * returns 401, we transparently hit `POST /auth/refresh` (which rotates the
 * cookie and returns a fresh access token) exactly once and retry the original
 * request. If the refresh also fails, the session is truly dead and we bounce to
 * /login.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

/**
 * The current access token, held in memory only. Seeded by AuthProvider on boot
 * (via a /auth/refresh call) and after login/register, and refreshed silently on
 * 401. Cleared on logout. Deliberately NOT persisted anywhere.
 */
let accessToken: string | null = null;

/** Set (or clear) the in-memory access token. Called by AuthProvider. */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Read the in-memory access token (mainly for debugging/tests). */
export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Endpoints where a 401 is a normal outcome, not "your session expired":
 * - login/register/google → wrong credentials, surface inline
 * - refresh/logout → the cookie itself is the credential; a 401 here means
 *   "no valid session", which the caller handles (it must NOT trigger a
 *   redirect or a recursive refresh attempt).
 */
const AUTH_EXEMPT_PREFIXES = [
  "/auth/login",
  "/auth/register",
  "/auth/google",
  "/auth/refresh",
  "/auth/logout",
];

function isAuthExempt(endpoint: string): boolean {
  return AUTH_EXEMPT_PREFIXES.some((prefix) => endpoint.startsWith(prefix));
}

/** Module-level guard so several concurrent 401s only trigger one redirect. */
let isRedirectingToLogin = false;

/**
 * Central handling for a session that can't be recovered: drop the in-memory
 * token and send the user to the login page. Safe during SSR (no-ops there).
 */
function handleUnauthorized(endpoint: string): void {
  if (isAuthExempt(endpoint)) return;

  // Server-side rendering — no window.
  if (typeof window === "undefined") return;

  accessToken = null;

  if (isRedirectingToLogin) return;

  // Already on the login page: no need to navigate again
  if (window.location.pathname === "/login") return;

  isRedirectingToLogin = true;
  // Plain redirect — this module lives outside React, so no router available
  window.location.replace("/login");
}

/**
 * De-duplicated silent refresh. Concurrent 401s share a single in-flight
 * refresh so we only rotate the cookie once. Returns the new access token, or
 * null when there is no recoverable session.
 */
let refreshPromise: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      // Auth-exempt endpoint: a 401 here won't recurse or redirect.
      const res = await apiRequest<{ token: string }>("/auth/refresh", {
        method: "POST",
      });
      const token = res.data?.token ?? null;
      accessToken = token;
      return token;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  /** Explicit token override. When omitted, the in-memory access token is used. */
  token?: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

/**
 * Generic API request function.
 * Automatically handles JSON serialization, auth headers, cookie credentials,
 * and transparent access-token refresh on 401.
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {},
  isRetry = false
): Promise<ApiResponse<T>> {
  const { method = "GET", body, headers = {}, token } = options;

  const effectiveToken = token ?? accessToken;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (effectiveToken) {
    requestHeaders["Authorization"] = `Bearer ${effectiveToken}`;
  }

  const config: RequestInit = {
    method,
    headers: requestHeaders,
    // Send the HttpOnly refresh cookie with every request.
    credentials: "include",
  };

  if (body && method !== "GET") {
    config.body = JSON.stringify(body);
  }

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      // Expired access token — try one silent refresh + retry before giving up.
      if (response.status === 401 && !isAuthExempt(endpoint) && !isRetry) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          // Retry once, forcing the freshly minted token (overriding any stale
          // explicit token the caller passed in).
          return apiRequest<T>(endpoint, { ...options, token: newToken }, true);
        }
        handleUnauthorized(endpoint);
      } else if (response.status === 401 && !isAuthExempt(endpoint)) {
        // Retry already attempted and still 401 — session is dead.
        handleUnauthorized(endpoint);
      }

      throw {
        success: false,
        message: data.message || `Request failed with status ${response.status}`,
        status: response.status,
      };
    }

    return data as ApiResponse<T>;
  } catch (error: unknown) {
    // Re-throw API errors as-is
    if (
      typeof error === "object" &&
      error !== null &&
      "success" in error &&
      (error as { success: boolean }).success === false
    ) {
      throw error;
    }

    // Network or unexpected errors
    throw {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
