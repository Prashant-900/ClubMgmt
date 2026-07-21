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
  { label: "All", value: "ALL" },
  { label: "Coordinators", value: "COORDINATOR" },
  { label: "Members", value: "MEMBER" },
];

function SkeletonCard() {
  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-5 space-y-4">
      <div className="flex items-start gap-3.5">
        <div className="w-11 h-11 rounded-full skeleton shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 skeleton rounded" />
          <div className="h-3 w-44 skeleton rounded" />
        </div>
        <div className="h-5 w-16 skeleton rounded-full" />
      </div>
      <div className="h-3 w-28 skeleton rounded" />
      <div className="flex justify-between pt-2 border-t border-white/5">
        <div className="h-3 w-16 skeleton rounded" />
        <div className="h-3 w-20 skeleton rounded" />
      </div>
    </div>
  );
}

export function MemberGrid({ clubId }: { clubId?: string }) {
  const { token, user } = useAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;

    listClubs()
      .then((res) => {
        if (res.success && res.data) {
          setClubs(res.data);
        }
      })
      .catch(() => setClubs([]));
  }, [user?.role]);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { role?: string; page?: number; limit?: number; clubId?: string } = {
        page,
        limit: 20,
      };
      if (activeFilter !== "ALL") {
        params.role = activeFilter;
      }
      if (clubId) {
        params.clubId = clubId;
      }

      const res = await listMembers(params, token ?? undefined);
      if (res.success && res.data) {
        setMembers(res.data.members);
        setTotalPages(res.data.pagination.totalPages);
        setTotal(res.data.pagination.total);
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Failed to fetch members";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token, activeFilter, page, clubId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleRemove = async (id: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    try {
      await removeMember(id, token ?? undefined);
      fetchMembers();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Failed to remove member";
      alert(message);
    }
  };

  const handleFilterChange = (filter: FilterTab) => {
    setActiveFilter(filter);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Filter tabs — visible to ADMIN only */}
      <RoleGate allowedRoles={["ADMIN"]}>
        <div className="flex items-center gap-2 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleFilterChange(tab.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer
                ${
                  activeFilter === tab.value
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200 border border-white/5"
                }`}
            >
              {tab.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-600">
            {total} {total === 1 ? "member" : "members"}
          </span>
        </div>
      </RoleGate>

      {/* Error state */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400 flex items-center gap-3">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <p className="font-medium">Could not load members</p>
            <p className="text-xs text-red-400/60 mt-0.5">{error}</p>
          </div>
          <button
            onClick={fetchMembers}
            className="ml-auto px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Member grid */}
      {!loading && !error && members.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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

      {/* Empty state */}
      {!loading && !error && members.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <p className="text-gray-400 font-medium">No members found</p>
          <p className="text-xs text-gray-600 mt-1">
            {activeFilter !== "ALL"
              ? `No ${activeFilter.toLowerCase()}s in the system`
              : "Invite members to get started"}
          </p>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs font-medium bg-white/5 border border-white/5 rounded-lg
                       hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            ← Prev
          </button>
          <span className="text-xs text-gray-500 px-3">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-xs font-medium bg-white/5 border border-white/5 rounded-lg
                       hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
