"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { listMembers, removeMember } from "@/lib/api/member.api";
import { listClubs } from "@/lib/api/club.api";
import { MemberCard } from "@/components/members/MemberCard";
import { RoleGate } from "@/components/ui/RoleGate";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Pagination } from "@/components/ui/Pagination";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { getApiErrorMessage } from "@/lib/hooks/apiError";
import type { User, Role, Club } from "@/types";

type FilterTab = "ALL" | Role;

const FILTER_TABS: { label: string; value: FilterTab }[] = [
  { label: "All members",  value: "ALL" },
  { label: "Coordinators", value: "COORDINATOR" },
  { label: "Members",      value: "MEMBER" },
];

/** Rows per page. The API clamps `limit` to 100, so never ask for the world. */
const PAGE_SIZE = 20;

export function MemberGrid({ clubId }: { clubId?: string }) {
  const { token, user } = useAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [removeTargetId, setRemoveTargetId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  // Typing stays instant; only the debounced value drives requests.
  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    listClubs()
      .then((res) => { if (res.success && res.data) setClubs(res.data); })
      .catch(() => setClubs([]));
  }, [user?.role]);

  // Any change to the query itself must start again from page 1
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeFilter, clubId]);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const search = debouncedSearch.trim();
      const res = await listMembers(
        {
          page,
          limit: PAGE_SIZE,
          ...(activeFilter !== "ALL" ? { role: activeFilter } : {}),
          ...(clubId ? { clubId } : {}),
          ...(search ? { search } : {}),
        },
        token ?? undefined
      );

      if (res.success && res.data) {
        // Sort within the page: coordinators first, then by name
        const sorted = [...res.data.members].sort((a, b) => {
          if (a.role === "COORDINATOR" && b.role !== "COORDINATOR") return -1;
          if (b.role === "COORDINATOR" && a.role !== "COORDINATOR") return 1;
          return (a.name ?? "").localeCompare(b.name ?? "");
        });
        setMembers(sorted);
        setTotalPages(res.data.pagination.totalPages);
        setTotal(res.data.pagination.total);
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to fetch members"));
    } finally {
      setLoading(false);
    }
  }, [token, activeFilter, page, clubId, debouncedSearch]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleRemove = (id: string) => setRemoveTargetId(id);

  const confirmRemove = async () => {
    if (!removeTargetId) return;
    setRemoving(true);
    try {
      await removeMember(removeTargetId, token ?? undefined);
      setRemoveTargetId(null);
      fetchMembers();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to remove member"));
      setRemoveTargetId(null);
    } finally {
      setRemoving(false);
    }
  };

  const canRemoveMember = (member: User) => {
    if (!user || user.id === member.id) {
      return false;
    }

    if (user.role === "ADMIN") {
      return true;
    }

    if (user.role === "COORDINATOR") {
      return member.role === "MEMBER" && member.club?.id === user.clubId;
    }

    return false;
  };


  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          {/* Two-tone brand search icon — blue lens, green handle */}
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.2}
            aria-hidden
          >
            <circle cx="11" cy="11" r="6" stroke="#4285f4" strokeLinecap="round" />
            <path d="M21 21l-4.35-4.35" stroke="#34a853" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search members…"
            aria-label="Search members"
            className="gh-input"
            style={{ paddingLeft: 40 }}
          />
        </div>

        {/* Role filter — ADMIN only */}
        <RoleGate allowedRoles={["ADMIN"]}>
          <div className="flex items-center border border-[#dadce0] rounded-md overflow-hidden text-xs">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveFilter(tab.value)}
                className={`px-3 py-1.5 font-medium transition-colors cursor-pointer border-r border-[#dadce0] last:border-r-0 whitespace-nowrap ${
                  activeFilter === tab.value
                    ? "bg-[#f1f3f4] text-[#202124]"
                    : "text-[#5f6368] hover:bg-[#f8f9fa] hover:text-[#202124]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </RoleGate>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-md bg-[rgba(234,67,53,0.1)] border border-[rgba(234,67,53,0.3)] text-sm text-[#c5221f] flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchMembers} className="gh-btn gh-btn-default gh-btn-sm min-h-[36px] ml-4">Retry</button>
        </div>
      )}

      {/* Contributor list container */}
      <div className="border border-[#dadce0] rounded-md overflow-hidden">
        {/* List header */}
        <div className="flex items-center px-4 py-2 bg-[#f8f9fa] border-b border-[#dadce0]">
          <span className="text-xs font-medium text-[#5f6368]">
            {loading ? "Loading…" : `${total} ${total === 1 ? "member" : "members"}`}
          </span>
        </div>

        {/* Rows */}
        {loading ? (
          <div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-[#f1f3f4] last:border-b-0">
                <div className="w-8 h-8 rounded-full skeleton shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-32 skeleton rounded" />
                  <div className="h-3 w-48 skeleton rounded" />
                </div>
                <div className="w-20 h-3 skeleton rounded hidden sm:block" />
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-[#5f6368]">
              {debouncedSearch.trim()
                ? `No members match “${debouncedSearch.trim()}”`
                : activeFilter !== "ALL"
                ? `No ${activeFilter.toLowerCase()}s found`
                : "No members found. Invite members to get started."}
            </p>
          </div>
        ) : (
          <div>
            {members.map((member, i) => (
              <MemberCard
                key={member.id}
                member={member}
                onRemove={canRemoveMember(member) ? handleRemove : undefined}
                onRefresh={fetchMembers}
                clubs={clubs}
                index={i}
              />
            ))}
          </div>
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        busy={loading}
        itemLabel="member"
      />

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
