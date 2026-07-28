import { apiRequest } from "./client";
import type { Club } from "@/types";

/**
 * List all clubs.
 * Public endpoint — no auth required.
 */
export async function listClubs() {
  return apiRequest<Club[]>("/clubs");
}

/**
 * Create a new club.
 */
export async function createClub(name: string, token?: string) {
  return apiRequest<Club>("/clubs", {
    method: "POST",
    body: { name },
    token,
  });
}

/**
 * Delete a club and clean up dependent records.
 */
export async function deleteClub(id: string, token?: string) {
  return apiRequest<{ message: string }>(`/clubs/${id}`, {
    method: "DELETE",
    token,
  });
}
