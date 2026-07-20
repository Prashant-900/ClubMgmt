import { apiRequest } from "./client";
import type { User, AuthResponse } from "@/types";

/**
 * Register / complete profile for an invited user.
 */
export async function register(data: {
  email: string;
  password: string;
  name: string;
  phone?: string;
}) {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: data,
  });
}

/**
 * Login with email and password.
 */
export async function login(data: { email: string; password: string }) {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: data,
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
