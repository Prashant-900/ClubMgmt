import { apiRequest } from './client';
import { toQuery } from './member.api';
import type {
  ClubAnalytics,
  Contribution,
  ContributionCategory,
  ContributionListResponse,
  ContributionStatus,
  GlobalAnalytics,
  HeatmapResponse,
  LeaderboardPeriod,
  LeaderboardResponse,
} from '../types';

/**
 * Contribution API — mirrors frontend/lib/api/contribution.api.ts.
 */

export interface CreateContributionPayload {
  title: string;
  description?: string;
  category: ContributionCategory;
  hours: number;
  datePerformed: string;
  attachmentUrl?: string;
  clubId?: string;
}

export function createContribution(payload: CreateContributionPayload) {
  return apiRequest<Contribution>('/contributions', {
    method: 'POST',
    body: { ...payload },
  });
}

export interface ListMyContributionsParams {
  status?: ContributionStatus;
  category?: ContributionCategory;
  page?: number;
  limit?: number;
}

export function listMyContributions(params: ListMyContributionsParams = {}) {
  return apiRequest<ContributionListResponse>(
    `/contributions/me${toQuery(params)}`,
  );
}

export interface ListContributionsParams extends ListMyContributionsParams {
  clubId?: string;
  userId?: string;
}

export function listContributions(params: ListContributionsParams = {}) {
  return apiRequest<ContributionListResponse>(
    `/contributions${toQuery(params)}`,
  );
}

export function getContributionById(id: string) {
  return apiRequest<Contribution>(`/contributions/${id}`);
}

export function updateContribution(
  id: string,
  payload: Partial<CreateContributionPayload>,
) {
  return apiRequest<Contribution>(`/contributions/${id}`, {
    method: 'PATCH',
    body: { ...payload },
  });
}

export function approveContribution(id: string) {
  return apiRequest<Contribution>(`/contributions/${id}/approve`, {
    method: 'PATCH',
  });
}

export function rejectContribution(id: string, rejectionReason?: string) {
  return apiRequest<Contribution>(`/contributions/${id}/reject`, {
    method: 'PATCH',
    body: rejectionReason ? { rejectionReason } : {},
  });
}

export function deleteContribution(id: string) {
  return apiRequest<null>(`/contributions/${id}`, { method: 'DELETE' });
}

// ── Analytics ──
export function getClubAnalytics(clubId?: string) {
  return apiRequest<ClubAnalytics>(
    `/contributions/analytics/club${toQuery({ clubId })}`,
  );
}

export function getGlobalAnalytics(clubId?: string) {
  return apiRequest<GlobalAnalytics>(
    `/contributions/analytics/global${toQuery({ clubId })}`,
  );
}

export interface HeatmapParams {
  userId?: string;
  clubId?: string;
  days?: number;
}

export function getContributionHeatmap(params: HeatmapParams = {}) {
  return apiRequest<HeatmapResponse>(
    `/contributions/heatmap${toQuery(params)}`,
  );
}

export interface LeaderboardParams {
  period?: LeaderboardPeriod;
  clubId?: string;
  page?: number;
  limit?: number;
}

export function getLeaderboard(params: LeaderboardParams = {}) {
  return apiRequest<LeaderboardResponse>(
    `/contributions/leaderboard${toQuery(params)}`,
  );
}
