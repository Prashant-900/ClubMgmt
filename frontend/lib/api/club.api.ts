import { apiRequest } from "./client";
import type { Club } from "@/types";

/**
 * List all clubs.
 * Public endpoint — no auth required.
 */
export async function listClubs() {
  return apiRequest<Club[]>("/clubs");
}
