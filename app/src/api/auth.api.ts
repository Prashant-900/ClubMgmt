import { apiRequest } from './client';
import type { AuthResponse, User } from '../types';

/**
 * Auth API — mirrors frontend/lib/api/auth.api.ts.
 *
 * Note on the refresh cookie: on the web the HttpOnly `clubmgmt.refresh` cookie
 * is sent via `credentials: "include"`. On React Native the native cookie jar
 * persists and replays it automatically, so no extra wiring is needed here.
 */

/** Exchange the refresh cookie for a fresh short-lived access token. */
export function refreshSession() {
  return apiRequest<{ token: string }>('/auth/refresh', { method: 'POST' });
}

/** Invalidate the server-side refresh session and clear its cookie. */
export function logout() {
  return apiRequest<null>('/auth/logout', { method: 'POST' });
}

export interface RegisterPayload {
  inviteToken: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export function register(payload: RegisterPayload) {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: { ...payload },
  });
}

export interface LoginPayload {
  email: string;
  password: string;
}

export function login(payload: LoginPayload) {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: { ...payload },
  });
}

/** Fetch the current user's profile. Pass a token override during bootstrap. */
export function getProfile(token?: string) {
  return apiRequest<User>('/auth/profile', { token });
}
