import { apiRequest } from './client';
import type { User } from '../types';

/**
 * Auth API — mirrors frontend/lib/api/auth.api.ts.
 *
 * Note: unlike the web, there is no `refreshSession()` here. React Native can't
 * use the HttpOnly refresh cookie, so the app persists the access token itself
 * (see api/client.ts) and re-authenticates via Google when it expires.
 */

/** Invalidate the server-side refresh session and clear its cookie. */
export function logout() {
  return apiRequest<null>('/auth/logout', { method: 'POST' });
}

/** Fetch the current user's profile. Pass a token override during bootstrap. */
export function getProfile(token?: string) {
  return apiRequest<User>('/auth/profile', { token });
}
