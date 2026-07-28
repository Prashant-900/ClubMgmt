/**
 * Centralized API client for making requests to the backend.
 * All API modules should use this client instead of calling fetch directly.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

/** Must stay in sync with the key used by AuthProvider. */
const TOKEN_STORAGE_KEY = "clubmgmt.auth.token";

/**
 * Endpoints where a 401 means "those credentials are wrong", not
 * "your session expired" — these must surface an inline error instead of
 * bouncing the user off the page.
 */
const AUTH_ENDPOINT_PREFIXES = ["/auth/login", "/auth/register", "/auth/google"];

/** Module-level guard so several concurrent 401s only trigger one redirect. */
let isRedirectingToLogin = false;

/**
 * Central handling for an expired/invalid token: drop the dead token and
 * send the user to the login page. Safe to call during SSR (no-ops there).
 */
function handleUnauthorized(endpoint: string): void {
  if (AUTH_ENDPOINT_PREFIXES.some((prefix) => endpoint.startsWith(prefix))) {
    return;
  }

  // Server-side rendering — no localStorage, no window.location
  if (typeof window === "undefined") return;

  if (isRedirectingToLogin) return;

  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // localStorage can throw when storage is disabled — nothing to recover
  }

  // Already on the login page: no need to navigate again
  if (window.location.pathname === "/login") return;

  isRedirectingToLogin = true;
  // Plain redirect — this module lives outside React, so no router available
  window.location.replace("/login");
}

interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  token?: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

/**
 * Generic API request function.
 * Automatically handles JSON serialization, auth headers, and error parsing.
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = "GET", body, headers = {}, token } = options;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (token) {
    requestHeaders["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body && method !== "GET") {
    config.body = JSON.stringify(body);
  }

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      // Expired or invalid session — clear it and bounce to /login
      if (response.status === 401) {
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
