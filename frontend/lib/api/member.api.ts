import { apiRequest } from "./client";
import type { User, PaginatedResponse } from "@/types";

/**
 * Invite a new member with a specific role.
 */
export async function inviteMember(
  data: { email: string; role: string },
  token: string
) {
  return apiRequest<User>("/members/invite", {
    method: "POST",
    body: data,
    token,
  });
}

/**
 * List members with optional role filter and pagination.
 */
export async function listMembers(
  params: { role?: string; page?: number; limit?: number } = {},
  token: string
) {
  const searchParams = new URLSearchParams();
  if (params.role) searchParams.set("role", params.role);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();
  const endpoint = `/members${query ? `?${query}` : ""}`;

  return apiRequest<PaginatedResponse<User>>(endpoint, { token });
}

/**
 * Get a specific member by ID.
 */
export async function getMemberById(id: string, token: string) {
  return apiRequest<User>(`/members/${id}`, { token });
}

/**
 * Remove a member by ID.
 */
export async function removeMember(id: string, token: string) {
  return apiRequest<{ message: string }>(`/members/${id}`, {
    method: "DELETE",
    token,
  });
}
