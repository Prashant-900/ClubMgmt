import { apiRequest } from "./client";
import type { User, PaginatedResponse } from "@/types";

/**
 * List members with optional role filter and pagination.
 */
export async function listMembers(
  params: { role?: string; page?: number; limit?: number; clubId?: string; search?: string; clubStatus?: string } = {},
  token?: string
) {
  const searchParams = new URLSearchParams();
  if (params.role) searchParams.set("role", params.role);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.clubId) searchParams.set("clubId", params.clubId);
  if (params.search) searchParams.set("search", params.search);
  if (params.clubStatus) searchParams.set("clubStatus", params.clubStatus);

  const query = searchParams.toString();
  const endpoint = `/members${query ? `?${query}` : ""}`;

  return apiRequest<PaginatedResponse<User>>(endpoint, { token });
}

/**
 * Get a specific member by ID.
 */
export async function getMemberById(id: string, token?: string) {
  return apiRequest<User>(`/members/${id}`, { token });
}

/**
 * Remove a member by ID.
 */
export async function removeMember(id: string, token?: string) {
  return apiRequest<{ message: string }>(`/members/${id}`, {
    method: "DELETE",
    token,
  });
}

/**
 * Promote a member to a club lead for a specific club.
 */
export async function promoteMember(
  id: string,
  data: { clubId: string },
  token?: string
) {
  return apiRequest<User>(`/members/${id}/promote`, {
    method: "POST",
    body: data,
    token,
  });
}
