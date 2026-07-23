"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { listMembers, removeMember } from "@/lib/api/member.api";
import { listClubs } from "@/lib/api/club.api";
import { MemberCard } from "@/components/members/MemberCard";
import { RoleGate } from "@/components/ui/RoleGate";
import type { User, Role, Club } from "@/types";

type FilterTab = "ALL" | Role;

const FILTER_TABS: { label: string; value: FilterTab }[] = [
  { label: "All members",  value: "ALL" },
  { label: "Coordinators", value: "COORDINATOR" },
  { label: "Members",      value: "MEMBER" },
];

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

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    listClubs()
      .then((res) => { if (res.success && res.data) setClubs(res.data); })
      .catch(() => setClubs([]));
  }, [user?.role]);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { page, limit: 30 };
      if (activeFilter !== "ALL") params.role = activeFilter;
      if (clubId) params.clubId = clubId;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await listMembers(params as Parameters<typeof listMembers>[0], token ?? undefined);
      if (res.success && res.data) {
        // Sort: coordinators first, then by name
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
      const msg = err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message
        : "Failed to fetch members";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [token, activeFilter, page, clubId, searchTerm]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleRemove = async (id: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    try {
      await removeMember(id, token ?? undefined);
      fetchMembers();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message : "Failed to remove member";
      alert(msg);
    }
  };

  const handleFilterChange = (filter: FilterTab) => {
    setActiveFilter(filter);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6e7681]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            placeholder="Search members…"
            className="gh-input pl-9"
          />
        </div>

        {/* Role filter — ADMIN only */}
        <RoleGate allowedRoles={["ADMIN"]}>
          <div className="flex items-center border border-[#30363d] rounded-md overflow-hidden text-xs">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleFilterChange(tab.value)}
                className={`px-3 py-1.5 font-medium transition-colors cursor-pointer border-r border-[#30363d] last:border-r-0 whitespace-nowrap ${
                  activeFilter === tab.value
                    ? "bg-[#21262d] text-[#e6edf3]"
                    : "text-[#8b949e] hover:bg-[#161b22] hover:text-[#e6edf3]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </RoleGate>

        <span className="text-xs text-[#8b949e] sm:ml-auto">
          {total} {total === 1 ? "member" : "members"}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-md bg-[rgba(248,81,73,0.1)] border border-[rgba(248,81,73,0.3)] text-sm text-[#f85149] flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchMembers} className="gh-btn gh-btn-default gh-btn-sm ml-4">Retry</button>
        </div>
      )}

      {/* Contributor list container */}
      <div className="border border-[#30363d] rounded-md overflow-hidden">
        {/* List header */}
        <div className="flex items-center px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
          <span className="text-xs font-medium text-[#8b949e]">
            {loading ? "Loading…" : `${total} ${total === 1 ? "member" : "members"}`}
          </span>
        </div>

        {/* Rows */}
        {loading ? (
          <div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-[#21262d] last:border-b-0">
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
            <p className="text-sm text-[#8b949e]">
              {activeFilter !== "ALL"
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
                onRemove={handleRemove}
                clubs={clubs}
                index={i}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="gh-btn gh-btn-default gh-btn-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <span className="text-xs text-[#8b949e]">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="gh-btn gh-btn-default gh-btn-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
