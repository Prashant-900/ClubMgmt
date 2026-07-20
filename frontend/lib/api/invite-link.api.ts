import { apiRequest } from "./client";
import type { InviteLink } from "@/types";

/**
 * Create a new invite link.
 * Requires ADMIN or COORDINATOR role.
 */
export async function createInviteLink(
  data: { role: string; clubId?: string; maxUses: number; expiresInDays: number },
  token?: string
) {
  return apiRequest<InviteLink>("/invite-links", {
    method: "POST",
    body: data,
    token,
  });
}

/**
 * Validate an invite link token (public — no auth required).
 * Used by the register page to check if the link is valid.
 */
export async function validateInviteLink(linkToken: string) {
  return apiRequest<InviteLink>(`/invite-links/validate/${linkToken}`);
}

/**
 * List invite links created by the current user (or all for admin).
 */
export async function listInviteLinks(token?: string) {
  return apiRequest<InviteLink[]>("/invite-links", { token });
}

/**
 * Revoke (delete) an invite link.
 */
export async function revokeInviteLink(id: string, token?: string) {
  return apiRequest<{ message: string }>(`/invite-links/${id}`, {
    method: "DELETE",
    token,
  });
}
