import { apiRequest } from './client';
import { toQuery } from './member.api';
import type { InviteLink, Role } from '../types';

/**
 * Invite-link API — mirrors frontend/lib/api/invite-link.api.ts.
 */

export interface CreateInviteLinkPayload {
  role: Role;
  clubId?: string;
  maxUses: number;
  expiresInDays: number;
}

export function createInviteLink(payload: CreateInviteLinkPayload) {
  return apiRequest<InviteLink>('/invite-links', {
    method: 'POST',
    body: { ...payload },
  });
}

/** Public — validate a link token before showing the registration form. */
export function validateInviteLink(linkToken: string) {
  return apiRequest<InviteLink>(`/invite-links/validate/${linkToken}`);
}

export function listInviteLinks(params: { clubId?: string } = {}) {
  return apiRequest<InviteLink[]>(`/invite-links${toQuery(params)}`);
}

export function revokeInviteLink(id: string) {
  return apiRequest<null>(`/invite-links/${id}`, { method: 'DELETE' });
}
