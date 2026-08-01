"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { listMembers, removeMember } from "@/lib/api/member.api";
import { listClubs } from "@/lib/api/club.api";
import { MemberCard } from "@/components/members/MemberCard";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Pagination } from "@/components/ui/Pagination";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { getApiErrorMessage } from "@/lib/hooks/apiError";
import type { Club, User } from "@/types";

/** Rows per page, per section. The API clamps `limit` to 100. */
const PAGE_SIZE = 20;

/** Small inline failure notice so one dead section doesn't blank the page. */
function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="px-4 py-3 rounded-md bg-[rgba(234,67,53,0.1)] border border-[rgba(234,67,53,0.3)] text-sm text-[#c5221f] flex items-center justify-between gap-4">
      <span>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="gh-btn gh-btn-default gh-btn-sm min-h-[36px] shrink-0"
      >
        Retry
      </button>
    </div>
  );
}

function MemberRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="border border-[#dadce0] rounded-md overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-[#f1f3f4] last:border-b-0">
          <div className="w-8 h-8 rounded-full skeleton shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-32 skeleton rounded" />
            <div className="h-3 w-48 skeleton rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminMembersOverview() {
  const { token } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [clubsError, setClubsError] = useState<string | null>(null);

  const [assignedMembers, setAssignedMembers] = useState<User[]>([]);
  const [assignedPage, setAssignedPage] = useState(1);
  const [assignedTotal, setAssignedTotal] = useState(0);
  const [assignedTotalPages, setAssignedTotalPages] = useState(1);
  const [assignedError, setAssignedError] = useState<string | null>(null);

  const [pendingMembers, setPendingMembers] = useState<User[]>([]);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingTotalPages, setPendingTotalPages] = useState(1);
  const [pendingError, setPendingError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removeTargetId, setRemoveTargetId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  // Input stays instant; requests wait for a 300ms lull.
  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  // A new search term invalidates both paginations
  useEffect(() => {
    setAssignedPage(1);
    setPendingPage(1);
  }, [debouncedSearch]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setClubsError(null);
    setAssignedError(null);
    setPendingError(null);

    const search = debouncedSearch.trim() || undefined;

    // allSettled — the club dropdown data and each member section are
    // independent; one failure must only take down its own section.
    const [clubsResponse, assignedResponse, pendingResponse] = await Promise.allSettled([
      listClubs(),
      listMembers(
        { clubStatus: "assigned", page: assignedPage, limit: PAGE_SIZE, search },
        token ?? undefined
      ),
      listMembers(
        { clubStatus: "pending", page: pendingPage, limit: PAGE_SIZE, search },
        token ?? undefined
      ),
    ]);

    if (clubsResponse.status === "fulfilled") {
      setClubs(clubsResponse.value.data ?? []);
    } else {
      setClubs([]);
      setClubsError(
        getApiErrorMessage(clubsResponse.reason, "Failed to load clubs — assign and promote are unavailable")
      );
    }

    if (assignedResponse.status === "fulfilled") {
      const data = assignedResponse.value.data;
      setAssignedMembers(data?.members ?? []);
      setAssignedTotal(data?.pagination.total ?? 0);
      setAssignedTotalPages(data?.pagination.totalPages ?? 1);
    } else {
      setAssignedMembers([]);
      setAssignedError(getApiErrorMessage(assignedResponse.reason, "Failed to load members"));
    }

    if (pendingResponse.status === "fulfilled") {
      const data = pendingResponse.value.data;
      setPendingMembers(data?.members ?? []);
      setPendingTotal(data?.pagination.total ?? 0);
      setPendingTotalPages(data?.pagination.totalPages ?? 1);
    } else {
      setPendingMembers([]);
      setPendingError(getApiErrorMessage(pendingResponse.reason, "Failed to load pending members"));
    }

    setLoading(false);
  }, [token, debouncedSearch, assignedPage, pendingPage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRemove = (id: string) => setRemoveTargetId(id);

  const confirmRemove = async () => {
    if (!removeTargetId) return;
    setRemoving(true);
    try {
      await removeMember(removeTargetId, token ?? undefined);
      setRemoveTargetId(null);
      setRemoveError(null);
      fetchData();
    } catch (err: unknown) {
      setRemoveError(getApiErrorMessage(err, "Failed to remove member"));
      setRemoveTargetId(null);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Search */}
      <div className="relative max-w-sm">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#80868b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search members…"
          aria-label="Search members"
          className="gh-input pl-9"
        />
      </div>

      {removeError && <SectionError message={removeError} onRetry={fetchData} />}
      {clubsError && <SectionError message={clubsError} onRetry={fetchData} />}

      {loading ? (
        <MemberRowsSkeleton />
      ) : (
        <>
          {/* Assigned members */}
          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-[#202124]">
                Members
                <span className="ml-2 text-xs text-[#5f6368] font-normal">{assignedTotal}</span>
              </h2>
              <span className="text-xs text-[#80868b]">Assigned to a club</span>
            </div>

            {assignedError ? (
              <SectionError message={assignedError} onRetry={fetchData} />
            ) : (
              <>
                <div className="border border-[#dadce0] rounded-md overflow-hidden">
                  {assignedMembers.length === 0 ? (
                    <div className="py-8 text-center text-sm text-[#5f6368]">
                      No assigned members found.
                    </div>
                  ) : (
                    assignedMembers.map((m, i) => (
                      <MemberCard key={m.id} member={m} onRemove={handleRemove} onRefresh={fetchData} clubs={clubs} index={i} />
                    ))
                  )}
                </div>
                <Pagination
                  page={assignedPage}
                  totalPages={assignedTotalPages}
                  total={assignedTotal}
                  onPageChange={setAssignedPage}
                  busy={loading}
                  itemLabel="member"
                />
              </>
            )}
          </section>

          {/* Pending members */}
          {(pendingTotal > 0 || pendingError) && (
            <section className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-[#202124]">
                  Pending assignment
                  <span className="ml-2 text-xs text-[#5f6368] font-normal">{pendingTotal}</span>
                </h2>
                <span className="text-xs text-[#80868b]">Waiting for club assignment</span>
              </div>

              {pendingError ? (
                <SectionError message={pendingError} onRetry={fetchData} />
              ) : (
                <>
                  <div className="border border-[#dadce0] rounded-md overflow-hidden">
                    {pendingMembers.map((m, i) => (
                      <MemberCard key={m.id} member={m} onRemove={handleRemove} onRefresh={fetchData} clubs={clubs} index={i} />
                    ))}
                  </div>
                  <Pagination
                    page={pendingPage}
                    totalPages={pendingTotalPages}
                    total={pendingTotal}
                    onPageChange={setPendingPage}
                    busy={loading}
                    itemLabel="member"
                  />
                </>
              )}
            </section>
          )}
        </>
      )}

      <ConfirmModal
        open={removeTargetId !== null}
        title="Remove member"
        message="This member will lose access to the club. You can invite them again later."
        confirmLabel="Remove member"
        loading={removing}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTargetId(null)}
      />
    </div>
  );
}
