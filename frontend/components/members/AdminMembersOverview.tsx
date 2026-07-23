"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { listMembers, removeMember } from "@/lib/api/member.api";
import { listClubs } from "@/lib/api/club.api";
import { MemberCard } from "@/components/members/MemberCard";
import type { Club, User } from "@/types";

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
      if (clubsResponse.success && clubsResponse.data) setClubs(clubsResponse.data);
      if (assignedResponse.success && assignedResponse.data) setAssignedMembers(assignedResponse.data.members);
      if (pendingResponse.success && pendingResponse.data) setPendingMembers(pendingResponse.data.members);
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message
        : "Failed to fetch members";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token, searchTerm]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRemove = async (id: string) => {
    if (!confirm("Remove this member?")) return;
    try {
      await removeMember(id, token ?? undefined);
      fetchData();
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message : "Failed to remove member";
      alert(message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Search */}
      <div className="relative max-w-sm">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6e7681]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search members…"
          className="gh-input pl-9"
        />
      </div>

      {error && (
        <div className="px-4 py-3 rounded-md bg-[rgba(248,81,73,0.1)] border border-[rgba(248,81,73,0.3)] text-sm text-[#f85149] flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchData} className="gh-btn gh-btn-default gh-btn-sm ml-4">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="border border-[#30363d] rounded-md overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-[#21262d] last:border-b-0">
              <div className="w-8 h-8 rounded-full skeleton shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-32 skeleton rounded" />
                <div className="h-3 w-48 skeleton rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Assigned members */}
          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-[#e6edf3]">
                Members
                <span className="ml-2 text-xs text-[#8b949e] font-normal">{assignedMembers.length}</span>
              </h2>
              <span className="text-xs text-[#6e7681]">Assigned to a club</span>
            </div>
            <div className="border border-[#30363d] rounded-md overflow-hidden">
              {assignedMembers.length === 0 ? (
                <div className="py-8 text-center text-sm text-[#8b949e]">No assigned members found.</div>
              ) : (
                assignedMembers.map((m, i) => (
                  <MemberCard key={m.id} member={m} onRemove={handleRemove} onRefresh={fetchData} clubs={clubs} index={i} />
                ))
              )}
            </div>
          </section>

          {/* Pending members */}
          {pendingMembers.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-[#e6edf3]">
                  Pending assignment
                  <span className="ml-2 text-xs text-[#8b949e] font-normal">{pendingMembers.length}</span>
                </h2>
                <span className="text-xs text-[#6e7681]">Waiting for club assignment</span>
              </div>
              <div className="border border-[#30363d] rounded-md overflow-hidden">
                {pendingMembers.map((m, i) => (
                  <MemberCard key={m.id} member={m} onRemove={handleRemove} onRefresh={fetchData} clubs={clubs} index={i} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}