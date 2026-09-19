import { apiRequest } from "./client";
import type {
  Contribution,
  ContributionListResponse,
  ClubAnalytics,
  GlobalAnalytics,
  HeatmapResponse,
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
  category?: string;
  page?: number;
  limit?: number;
}

export async function listMyContributions(
  params: ContributionFilters = {},
  token?: string
) {
  const q = new URLSearchParams();
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

// ── Update ────────────────────────────────────────────────────────────────────

/**
 * Fields a member may change on their own contribution. Every field is
 * optional — only what is sent gets updated.
 */
export interface UpdateContributionPayload {
  title?: string;
  description?: string;
  category?: string;
  hours?: number;
  datePerformed?: string;
  attachmentUrl?: string;
}

/**
 * Edit a contribution. Only the owner may do this.
 */
export async function updateContribution(
  id: string,
  data: UpdateContributionPayload,
  token?: string
) {
  return apiRequest<Contribution>(`/contributions/${id}`, {
    method: "PATCH",
    body: data as unknown as Record<string, unknown>,
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

// ── Heatmap ───────────────────────────────────────────────────────────────────

/**
 * Daily contribution counts for a GitHub-style heatmap.
 *
 * `days` covers every day in the window, zero days included. Omitting both
 * `userId` and `clubId` scopes the response to the caller's own record.
 */
export async function getContributionHeatmap(
  params: { userId?: string; clubId?: string; days?: number } = {},
  token?: string
) {
  const q = new URLSearchParams();
  if (params.userId) q.set("userId", params.userId);
  if (params.clubId) q.set("clubId", params.clubId);
  if (params.days) q.set("days", String(params.days));
  const query = q.toString();
  return apiRequest<HeatmapResponse>(
    `/contributions/heatmap${query ? `?${query}` : ""}`,
    { token }
  );
}
