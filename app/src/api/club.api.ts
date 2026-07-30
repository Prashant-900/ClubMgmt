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

export function createClub(name: string) {
  return apiRequest<Club>('/clubs', {
    method: 'POST',
    body: { name },
  });
}

export function deleteClub(id: string) {
  return apiRequest<null>(`/clubs/${id}`, { method: 'DELETE' });
}
