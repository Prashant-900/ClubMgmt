import { apiRequest } from './client';
import type { MemberProfile, PaginatedResponse, Role, User } from '../types';

/**
 * Member API — mirrors frontend/lib/api/member.api.ts.
 */

export interface ListMembersParams {
  role?: Role;
  page?: number;
  limit?: number;
  clubId?: string;
  search?: string;
  /** 'assigned' | 'unassigned' — filter by whether the member has a club. */
  clubStatus?: 'assigned' | 'unassigned';
}

function toQuery<T extends object>(params: T): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== '',
  );
  if (entries.length === 0) {
    return '';
  }
  const qs = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `?${qs}`;
}

export function listMembers(params: ListMembersParams = {}) {
  return apiRequest<PaginatedResponse<User>>(`/members${toQuery(params)}`);
}

export function getMemberById(id: string) {
  return apiRequest<User>(`/members/${id}`);
}

export function getMemberProfile(id: string) {
  return apiRequest<MemberProfile>(`/members/${id}`);
}

export function removeMember(id: string) {
  return apiRequest<null>(`/members/${id}`, { method: 'DELETE' });
}

export function promoteMember(id: string, data: { clubId: string }) {
  return apiRequest<User>(`/members/${id}/promote`, {
    method: 'POST',
    body: data,
  });
}

export function assignMember(
  id: string,
  data: { clubId: string; role: 'COORDINATOR' | 'MEMBER' },
) {
  return apiRequest<User>(`/members/${id}/assign`, {
    method: 'POST',
    body: data,
  });
}

export { toQuery };
