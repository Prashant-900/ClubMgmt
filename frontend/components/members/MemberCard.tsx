"use client";

// MemberCard.tsx — GitHub contributor list row
import { useState } from "react";
import type { User, Club } from "@/types";
import { RoleGate } from "@/components/ui/RoleGate";
import { promoteMember, assignMember } from "@/lib/api/member.api";
import { useAuth } from "@/components/providers/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";
import { RoleBadge } from "@/components/ui/Badge";

interface MemberCardProps {
  member: User;
  onRemove?: (id: string) => void;
  onRefresh?: () => void;
  clubs?: Club[];
  index?: number;
}

export function MemberCard({ member, onRemove, onRefresh, clubs = [], index = 0 }: MemberCardProps) {
  const { token, user } = useAuth();
  const [selectedClubId, setSelectedClubId] = useState(member.club?.id ?? clubs[0]?.id ?? "");
  const [selectedRole, setSelectedRole] = useState<"COORDINATOR" | "MEMBER">("MEMBER");
  const [promoting, setPromoting] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const canPromote = user?.role === "ADMIN" && member.role !== "ADMIN" && !!member.club;
  const canAssign = user?.role === "ADMIN" && member.role !== "ADMIN" && !member.club;

  const handlePromote = async () => {
    if (!selectedClubId) return;
    setPromoting(true);
    setActionError(null);
    try {
      await promoteMember(member.id, { clubId: selectedClubId }, token ?? undefined);
      if (onRefresh) onRefresh();
      else window.location.reload();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message
        : "Failed to promote member";
      setActionError(msg);
    } finally {
      setPromoting(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedClubId) return;
    setAssigning(true);
    setActionError(null);
    try {
      await assignMember(member.id, { clubId: selectedClubId, role: selectedRole }, token ?? undefined);
      if (onRefresh) onRefresh();
      else window.location.reload();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message
        : "Failed to assign member";
      setActionError(msg);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div
      className="flex flex-col border-b border-[#21262d] last:border-b-0 hover:bg-[#161b22] transition-colors group animate-fade-in"
      style={{ animationDelay: `${index * 40}ms`, animationFillMode: "both" }}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Avatar */}
        <Avatar name={member.name} email={member.email} role={member.role} size="sm" />

        {/* Identity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-[#e6edf3] truncate">
              {member.name ?? "Pending setup"}
            </span>
            <RoleBadge role={member.role} />
            {member.isVerified && (
              <span className="text-[10px] text-[#3fb950]">✓ verified</span>
            )}
            {canAssign && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(210,153,34,0.15)] border border-[rgba(210,153,34,0.3)] text-[#e3b341]">
                pending
              </span>
            )}
          </div>
          <p className="text-xs text-[#8b949e] truncate mt-0.5">{member.email}</p>
          {member.club && (
            <p className="text-xs text-[#6e7681] mt-0.5">{member.club.name}</p>
          )}
        </div>

        {/* Join date */}
        <div className="text-right shrink-0 hidden sm:block">
          <span className="text-xs text-[#6e7681]">
            Joined{" "}
            {new Date(member.createdAt).toLocaleDateString("en-IN", {
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>

        {/* Admin actions toggle */}
        <div className="shrink-0">
          <RoleGate allowedRoles={["ADMIN"]}>
            <button
              onClick={() => { setShowActions(!showActions); setActionError(null); }}
              className="w-7 h-7 flex items-center justify-center text-[#6e7681] hover:text-[#e6edf3] hover:bg-[#21262d] rounded-md transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
              title="Actions"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM1.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm13 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
              </svg>
            </button>
          </RoleGate>
        </div>
      </div>

      {/* Expandable actions panel */}
      {showActions && (
        <div className="border-t border-[#21262d] px-4 pt-3 pb-3 space-y-2.5 bg-[#0d1117] animate-fade-in">

          {/* Error message */}
          {actionError && (
            <p className="text-xs text-[#f85149] bg-[rgba(248,81,73,0.1)] border border-[rgba(248,81,73,0.3)] rounded px-2 py-1.5">
              {actionError}
            </p>
          )}

          {/* ASSIGN action — for users with no club */}
          {canAssign && clubs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-[#e3b341]">Assign to club</p>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={selectedClubId}
                  onChange={(e) => setSelectedClubId(e.target.value)}
                  className="gh-select text-xs flex-1 min-w-[120px]"
                >
                  <option value="">Select club…</option>
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>{club.name}</option>
                  ))}
                </select>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as "COORDINATOR" | "MEMBER")}
                  className="gh-select text-xs w-[130px]"
                >
                  <option value="MEMBER">As Member</option>
                  <option value="COORDINATOR">As Coordinator</option>
                </select>
                <button
                  onClick={handleAssign}
                  disabled={assigning || !selectedClubId}
                  className="gh-btn gh-btn-default gh-btn-sm disabled:opacity-50"
                >
                  {assigning ? "Assigning…" : "Assign"}
                </button>
              </div>
            </div>
          )}

          {/* PROMOTE action — for already-assigned members */}
          {canPromote && clubs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-[#8b949e]">Promote to coordinator</p>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={selectedClubId}
                  onChange={(e) => setSelectedClubId(e.target.value)}
                  className="gh-select text-xs flex-1 min-w-[120px]"
                >
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>{club.name}</option>
                  ))}
                </select>
                <button
                  onClick={handlePromote}
                  disabled={promoting || !selectedClubId}
                  className="gh-btn gh-btn-default gh-btn-sm disabled:opacity-50"
                >
                  {promoting ? "Promoting…" : "Make coordinator"}
                </button>
              </div>
            </div>
          )}

          {/* REMOVE action */}
          {onRemove && (
            <div>
              <button
                onClick={() => onRemove(member.id)}
                className="gh-btn gh-btn-sm text-[#f85149] border-[rgba(248,81,73,0.4)] bg-transparent hover:bg-[rgba(248,81,73,0.1)]"
                style={{ border: "1px solid rgba(248,81,73,0.4)" }}
              >
                Remove member
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
