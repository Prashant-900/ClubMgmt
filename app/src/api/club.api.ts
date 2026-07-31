import { apiRequest } from './client';
import type { Club, EnrichedClub } from '../types';

/**
 * Club API — mirrors frontend/lib/api/club.api.ts.
 */

/** Public list of clubs. Pass `enriched` for member/contribution counts. */
export function listClubs(enriched = false) {
  const query = enriched ? '?enriched=true' : '';
  return apiRequest<(Club | EnrichedClub)[]>(`/clubs${query}`);
}

export function createClub(data: { name: string; description?: string }) {
  return apiRequest<Club>('/clubs', {
    method: 'POST',
    body: data,
  });
}

export function updateClub(id: string, data: { name: string; description?: string }) {
  return apiRequest<Club>(`/clubs/${id}`, {
    method: 'PATCH',
    body: data,
  });
}

export function deleteClub(id: string) {
  return apiRequest<null>(`/clubs/${id}`, { method: 'DELETE' });
}
