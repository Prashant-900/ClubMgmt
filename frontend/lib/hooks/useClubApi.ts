"use client";

import { useCallback, useMemo } from "react";
import { apiRequest } from "@/lib/api/client";
import { useAuth } from "@/components/providers/AuthProvider";
import type { Club, EnrichedClub } from "@/types";

/** Fields accepted by `PATCH /api/clubs/:id`. */
export interface ClubUpdatePayload {
  name?: string;
  description?: string | null;
}

export const CLUB_NAME_MAX = 100;
export const CLUB_DESCRIPTION_MAX = 500;

/**
 * Club endpoints used by the club grid and the club edit modal, bound to the
 * signed-in user's token.
 *
 * `lib/api/club.api.ts` still covers the lightweight public list and delete;
 * these are the authenticated variants the enriched grid needs.
 */
export function useClubApi() {
  const { token } = useAuth();

  /**
   * `GET /api/clubs?enriched=true` — one request that carries member counts,
   * contribution counts and coordinator names for every club. Requires a token.
   */
  const listEnrichedClubs = useCallback(
    () =>
      apiRequest<EnrichedClub[]>("/clubs?enriched=true", {
        token: token ?? undefined,
      }),
    [token]
  );

  /** `POST /api/clubs` — create a club, optionally with a description. */
  const createClub = useCallback(
    (payload: { name: string; description?: string }) =>
      apiRequest<Club>("/clubs", {
        method: "POST",
        body: { ...payload },
        token: token ?? undefined,
      }),
    [token]
  );

  /** `PATCH /api/clubs/:id` — ADMIN only. Throws with status 409 on a name clash. */
  const updateClub = useCallback(
    (id: string, payload: ClubUpdatePayload) =>
      apiRequest<Club>(`/clubs/${id}`, {
        method: "PATCH",
        body: { ...payload },
        token: token ?? undefined,
      }),
    [token]
  );

  return useMemo(
    () => ({ listEnrichedClubs, createClub, updateClub }),
    [listEnrichedClubs, createClub, updateClub]
  );
}
