import { apiRequest } from "./client";
import type { User, AuthResponse } from "@/types";

/**
 * Rotate the HttpOnly refresh cookie and get a fresh access token. The cookie
 * is sent automatically (credentials: "include"); no body is needed.
 */
export async function refreshSession() {
  return apiRequest<AuthResponse>("/auth/refresh", {
    method: "POST",
  });
}

/**
 * Revoke the current refresh token server-side and clear the cookie. Requires a
 * valid access token (the client attaches it automatically).
 */
export async function logout() {
  return apiRequest("/auth/logout", {
    method: "POST",
  });
}

/**
 * Get the current authenticated user's profile.
 */
export async function getProfile(token: string) {
  return apiRequest<User>("/auth/profile", {
    token,
  });
}
