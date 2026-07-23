import { apiRequest } from "./client";
import type {
  Contribution,
  ContributionListResponse,
  ClubAnalytics,
  GlobalAnalytics,
  LeaderboardResponse,
  LeaderboardPeriod,
} from "@/types";

// ── Create ────────────────────────────────────────────────────────────────────

export interface CreateContributionPayload {
  title: string;
  description?: string;
  category: string;
  hours: number;
  datePerformed: string;
  attachmentUrl?: string;
  clubId?: string; // Required for ADMIN
}

export async function createContribution(
  data: CreateContributionPayload,
  token?: string
) {
  return apiRequest<Contribution>("/contributions", {
    method: "POST",
    body: data as unknown as Record<string, unknown>,
    token,
  });
}

// ── Read ──────────────────────────────────────────────────────────────────────

export interface ContributionFilters {
  status?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export async function listMyContributions(
  params: ContributionFilters = {},
  token?: string
) {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.category) q.set("category", params.category);
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  const query = q.toString();
  return apiRequest<ContributionListResponse>(
    `/contributions/me${query ? `?${query}` : ""}`,
    { token }
  );
}

export async function listContributions(
  params: ContributionFilters & { clubId?: string; userId?: string } = {},
  token?: string
) {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.category) q.set("category", params.category);
  if (params.clubId) q.set("clubId", params.clubId);
  if (params.userId) q.set("userId", params.userId);
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  const query = q.toString();
  return apiRequest<ContributionListResponse>(
    `/contributions${query ? `?${query}` : ""}`,
    { token }
  );
}

export async function getContributionById(id: string, token?: string) {
  return apiRequest<Contribution>(`/contributions/${id}`, { token });
}

// ── Approve / Reject ──────────────────────────────────────────────────────────

export async function approveContribution(id: string, token?: string) {
  return apiRequest<Contribution>(`/contributions/${id}/approve`, {
    method: "PATCH",
    token,
  });
}

export async function rejectContribution(
  id: string,
  rejectionReason?: string,
  token?: string
) {
  return apiRequest<Contribution>(`/contributions/${id}/reject`, {
    method: "PATCH",
    body: { rejectionReason },
    token,
  });
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteContribution(id: string, token?: string) {
  return apiRequest<{ message: string }>(`/contributions/${id}`, {
    method: "DELETE",
    token,
  });
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export async function getClubAnalytics(clubId?: string, token?: string) {
  const q = clubId ? `?clubId=${clubId}` : "";
  return apiRequest<ClubAnalytics>(`/contributions/analytics/club${q}`, {
    token,
  });
}

export async function getGlobalAnalytics(clubId?: string, token?: string) {
  const q = clubId ? `?clubId=${clubId}` : "";
  return apiRequest<GlobalAnalytics>(`/contributions/analytics/global${q}`, {
    token,
  });
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export async function getLeaderboard(
  params: { period?: LeaderboardPeriod; clubId?: string; page?: number; limit?: number } = {},
  token?: string
) {
  const q = new URLSearchParams();
  if (params.period) q.set("period", params.period);
  if (params.clubId) q.set("clubId", params.clubId);
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  const query = q.toString();
  return apiRequest<LeaderboardResponse>(
    `/contributions/leaderboard${query ? `?${query}` : ""}`,
    { token }
  );
}
