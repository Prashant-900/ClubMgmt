"use client";

// MemberCard.tsx — GitHub contributor list row
import { useState } from "react";
import Link from "next/link";
import type { User, Club } from "@/types";
import { RoleGate } from "@/components/ui/RoleGate";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { promoteMember, assignMember } from "@/lib/api/member.api";
import { useAuth } from "@/components/providers/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";
import { RoleBadge } from "@/components/ui/Badge";
import { getApiErrorMessage } from "@/lib/hooks/apiError";

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
  // Set when the admin is about to promote someone into a *different* club
  const [confirmCrossClub, setConfirmCrossClub] = useState(false);

  const canPromote = user?.role === "ADMIN" && member.role !== "ADMIN" && !!member.club;
  const canAssign = user?.role === "ADMIN" && member.role !== "ADMIN" && !member.club;

  const displayName = member.name ?? member.email;
  const currentClub = member.club ?? null;
  const targetClub = clubs.find((c) => c.id === selectedClubId) ?? null;
  /**
   * Promoting into another club silently moves the member out of their
   * current one — never do that without an explicit confirmation.
   */
  const isCrossClubPromotion =
    !!currentClub && !!selectedClubId && selectedClubId !== currentClub.id;

  const handlePromote = async () => {
    if (!selectedClubId) return;
    setConfirmCrossClub(false);
    setPromoting(true);
    setActionError(null);
    try {
      await promoteMember(member.id, { clubId: selectedClubId }, token ?? undefined);
      if (onRefresh) onRefresh();
      else window.location.reload();
    } catch (err: unknown) {
      setActionError(getApiErrorMessage(err, "Failed to promote member"));
    } finally {
      setPromoting(false);
    }
  };

  const requestPromote = () => {
    if (!selectedClubId) return;
    if (isCrossClubPromotion) {
      setConfirmCrossClub(true);
      return;
    }
    handlePromote();
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
      setActionError(getApiErrorMessage(err, "Failed to assign member"));
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div
      className="flex flex-col border-b border-[#f1f3f4] last:border-b-0 hover:bg-[#f8f9fa] transition-colors group animate-fade-in"
      style={{ animationDelay: `${index * 40}ms`, animationFillMode: "both" }}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Avatar */}
        <Avatar name={member.name} email={member.email} role={member.role} size="sm" />

        {/* Identity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/members/${member.id}`}
              className="text-sm font-medium text-[#202124] truncate hover:text-[#1a73e8] hover:underline"
            >
              {member.name ?? "Pending setup"}
            </Link>
            <RoleBadge role={member.role} />
            {member.isVerified && (
              <span className="text-[10px] text-[#188038]">✓ verified</span>
            )}
            {canAssign && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(251,188,5,0.15)] border border-[rgba(251,188,5,0.3)] text-[#b06000]">
                pending
              </span>
            )}
          </div>
          <p className="text-xs text-[#5f6368] truncate mt-0.5">{member.email}</p>
          {member.club && (
            <p className="text-xs text-[#80868b] mt-0.5">{member.club.name}</p>
          )}
        </div>

        {/* Join date */}
        <div className="text-right shrink-0 hidden sm:block">
          <span className="text-xs text-[#80868b]">
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
              className="w-7 h-7 flex items-center justify-center text-[#80868b] hover:text-[#202124] hover:bg-[#f1f3f4] rounded-md transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
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
        <div className="border-t border-[#f1f3f4] px-4 pt-3 pb-3 space-y-2.5 bg-[#ffffff] animate-fade-in">

          {/* Error message */}
          {actionError && (
            <p className="text-xs text-[#c5221f] bg-[rgba(234,67,53,0.1)] border border-[rgba(234,67,53,0.3)] rounded px-2 py-1.5">
              {actionError}
            </p>
          )}

          {/* ASSIGN action — for users with no club */}
          {canAssign && clubs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-[#b06000]">Assign to domain</p>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={selectedClubId}
                  onChange={(e) => setSelectedClubId(e.target.value)}
                  className="gh-select text-xs flex-1 min-w-[120px]"
                >
                  <option value="">Select domain…</option>
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
              <p className="text-xs font-medium text-[#5f6368]">Promote to coordinator</p>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={selectedClubId}
                  onChange={(e) => setSelectedClubId(e.target.value)}
                  aria-label="Domain to coordinate"
                  className="gh-select text-xs flex-1 min-w-[120px]"
                >
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>{club.name}</option>
                  ))}
                </select>
                <button
                  onClick={requestPromote}
                  disabled={promoting || !selectedClubId}
                  className="gh-btn gh-btn-default gh-btn-sm disabled:opacity-50"
                >
                  {promoting ? "Promoting…" : "Make coordinator"}
                </button>
              </div>

              {/* Cross-club move warning — visible before the confirm step */}
              {isCrossClubPromotion && currentClub && (
                <p className="text-xs text-[#b06000] bg-[rgba(251,188,5,0.15)] border border-[rgba(251,188,5,0.3)] rounded px-2 py-1.5">
                  <span className="font-medium">Different domain.</span>{" "}
                  {displayName} is currently in {currentClub.name} — promoting them
                  here will move them out of it.
                </p>
              )}
            </div>
          )}

          {/* REMOVE action — never offered for the current user's own row */}
          {onRemove && member.id !== user?.id && (
            <div>
              <button
                onClick={() => onRemove(member.id)}
                className="gh-btn gh-btn-sm text-[#c5221f] border-[rgba(234,67,53,0.4)] bg-transparent hover:bg-[rgba(234,67,53,0.1)]"
                style={{ border: "1px solid rgba(234,67,53,0.4)" }}
              >
                Remove member
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cross-club promotion needs an explicit yes — it moves the member */}
      <ConfirmModal
        open={confirmCrossClub}
        title="Move member to another domain?"
        message={
          <>
            <span className="text-gh-text-primary font-medium">{displayName}</span> is
            currently in{" "}
            <span className="text-gh-text-primary font-medium">{currentClub?.name}</span>.
            Promoting them to Coordinator of{" "}
            <span className="text-gh-text-primary font-medium">
              {targetClub?.name ?? "the selected domain"}
            </span>{" "}
            will move them out of{" "}
            <span className="text-gh-text-primary font-medium">{currentClub?.name}</span>.
          </>
        }
        confirmLabel="Move and promote"
        cancelLabel="Cancel"
        variant="danger"
        loading={promoting}
        onConfirm={handlePromote}
        onCancel={() => setConfirmCrossClub(false)}
      />
    </div>
  );
}
