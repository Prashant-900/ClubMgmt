"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { listMembers, removeMember } from "@/lib/api/member.api";
import { listClubs } from "@/lib/api/club.api";
import { MemberCard } from "@/components/members/MemberCard";
import type { Club, User } from "@/types";

function SectionSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-5 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-full skeleton shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 skeleton rounded" />
              <div className="h-3 w-44 skeleton rounded" />
            </div>
            <div className="h-5 w-16 skeleton rounded-full" />
          </div>
          <div className="h-3 w-28 skeleton rounded" />
          <div className="h-3 w-20 skeleton rounded" />
        </div>
      ))}
    </div>
  );
}

export function AdminMembersOverview() {
  const { token } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [assignedMembers, setAssignedMembers] = useState<User[]>([]);
  const [pendingMembers, setPendingMembers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [clubsResponse, assignedResponse, pendingResponse] = await Promise.all([
        listClubs(),
        listMembers({ clubStatus: "assigned", limit: 1000, search: searchTerm.trim() || undefined }, token ?? undefined),
        listMembers({ clubStatus: "pending", limit: 1000, search: searchTerm.trim() || undefined }, token ?? undefined),
      ]);

      if (clubsResponse.success && clubsResponse.data) {
        setClubs(clubsResponse.data);
      }
      if (assignedResponse.success && assignedResponse.data) {
        setAssignedMembers(assignedResponse.data.members);
      }
      if (pendingResponse.success && pendingResponse.data) {
        setPendingMembers(pendingResponse.data.members);
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
  }, [token, searchTerm]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRemove = async (id: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      await removeMember(id, token ?? undefined);
      fetchData();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Failed to remove member";
      alert(message);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="flex-1 space-y-1">
            <span className="block text-xs uppercase tracking-[0.2em] text-gray-500">
              Search members
            </span>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search assigned or pending members"
              className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-sm text-gray-100 placeholder:text-gray-600 outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/10"
            />
          </label>
          <span className="text-xs text-gray-500 sm:self-end">
            {assignedMembers.length + pendingMembers.length} total members
          </span>
        </div>
      </div>

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
            onClick={fetchData}
            className="ml-auto px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {loading && <SectionSkeleton />}

      {!loading && !error && (
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-100">Members</h2>
                <p className="text-sm text-gray-500">People already assigned to a club</p>
              </div>
              <span className="text-xs text-gray-500">{assignedMembers.length} members</span>
            </div>
            {assignedMembers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {assignedMembers.map((member, index) => (
                  <MemberCard key={member.id} member={member} onRemove={handleRemove} clubs={clubs} index={index} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-sm text-gray-500">
                No assigned members found.
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-100">Pending members</h2>
                <p className="text-sm text-gray-500">Users waiting for a club assignment</p>
              </div>
              <span className="text-xs text-gray-500">{pendingMembers.length} members</span>
            </div>
            {pendingMembers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {pendingMembers.map((member, index) => (
                  <MemberCard key={member.id} member={member} onRemove={handleRemove} clubs={clubs} index={index} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-sm text-gray-500">
                No pending members found.
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}