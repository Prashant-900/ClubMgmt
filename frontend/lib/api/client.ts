/**
 * Centralized API client for making requests to the backend.
 * All API modules should use this client instead of calling fetch directly.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

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
