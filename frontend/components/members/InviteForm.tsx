"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  createInviteLink,
  listInviteLinks,
  revokeInviteLink,
} from "@/lib/api/invite-link.api";
import { listClubs } from "@/lib/api/club.api";
import { RoleGate } from "@/components/ui/RoleGate";
import { RoleBadge } from "@/components/ui/Badge";
import type { Role, InviteLink, Club } from "@/types";

function isExpired(expiresAt: string): boolean {
  return new Date() > new Date(expiresAt);
}

function isMaxed(link: InviteLink): boolean {
  return link.usedCount >= link.maxUses;
}

export function InviteLinkForm() {
  const { user, token } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const isCoordinator = user?.role === "COORDINATOR";

  // For admin: can choose between COORDINATOR and MEMBER
  // For coordinator: always MEMBER
  const [targetRole, setTargetRole] = useState<Role>(isAdmin ? "COORDINATOR" : "MEMBER");

  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [maxUses, setMaxUses] = useState(10);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [links, setLinks] = useState<InviteLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);
  // Track which link was just copied (by id)
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    listClubs()
      .then((res) => {
        if (res.success && res.data) {
          setClubs(res.data);
          if (res.data.length > 0) setSelectedClubId(res.data[0].id);
        }
      })
      .catch(() => {});
  }, [isAdmin]);

  const fetchLinks = useCallback(async () => {
    try {
      const res = await listInviteLinks(token ?? undefined);
      if (res.success && res.data) setLinks(res.data);
    } catch {
      /* silent */
    } finally {
      setLinksLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchLinks(); }, [fetchLinks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGeneratedLink(null);
    setCopied(false);

    if (isAdmin && !selectedClubId) {
      setError("Please select a club.");
      return;
    }

    setLoading(true);
    try {
      const res = await createInviteLink(
        {
          role: targetRole,
          clubId: isAdmin ? selectedClubId : user?.club?.id,
          maxUses,
          expiresInDays,
        },
        token ?? undefined
      );
      if (res.success && res.data) {
        const url = `${window.location.origin}/register/${res.data.token}`;
        setGeneratedLink(url);
        fetchLinks();
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Failed to create invite link";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (text: string, onDone: () => void) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const input = document.createElement("input");
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    onDone();
  };

  const handleCopy = () =>
    copyText(generatedLink!, () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });

  const handleCopyLink = (link: InviteLink) => {
    const url = `${window.location.origin}/register/${link.token}`;
    copyText(url, () => {
      setCopiedLinkId(link.id);
      setTimeout(() => setCopiedLinkId(null), 2000);
    });
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this invite link?")) return;
    try {
      await revokeInviteLink(id, token ?? undefined);
      fetchLinks();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Failed to revoke link";
      alert(message);
    }
  };

  return (
    <RoleGate
      allowedRoles={["ADMIN", "COORDINATOR"]}
      fallback={
        <div className="bg-[#161b22] border border-[#30363d] rounded-md p-12 text-center">
          <p className="text-sm text-[#f85149]">Access Denied</p>
          <p className="text-xs text-[#8b949e] mt-1">You don&apos;t have permission to create invite links</p>
        </div>
      }
    >
      <div className="max-w-2xl space-y-8">
        {/* Context banner */}
        <div className="bg-[rgba(31,111,235,0.1)] border border-[rgba(31,111,235,0.3)] rounded-md px-4 py-3 text-sm text-[#8b949e] flex items-start gap-2">
          <svg className="w-4 h-4 text-[#58a6ff] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            {isAdmin
              ? <>As an <span className="text-[#a371f7] font-medium">Admin</span>, you can create invite links for <span className="text-[#79c0ff] font-medium">Coordinators</span> or <span className="text-[#3fb950] font-medium">Members</span>. Select a club and role below.</>
              : <>As a <span className="text-[#79c0ff] font-medium">Coordinator</span>, you can create invite links for <span className="text-[#3fb950] font-medium">Members</span>. They&apos;ll join your club automatically.</>
            }
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-[#161b22] border border-[#30363d] rounded-md p-5 space-y-5">
          <h2 className="text-sm font-semibold text-[#e6edf3] border-b border-[#21262d] pb-3">
            Generate new invite link
          </h2>

          {/* Role selector — admin only; coordinator is always MEMBER */}
          {isAdmin ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#8b949e]">Inviting as</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTargetRole("COORDINATOR")}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md border text-sm font-medium transition-colors cursor-pointer ${
                    targetRole === "COORDINATOR"
                      ? "bg-[rgba(121,192,255,0.1)] border-[rgba(121,192,255,0.4)] text-[#79c0ff]"
                      : "bg-[#0d1117] border-[#30363d] text-[#6e7681] hover:text-[#e6edf3] hover:border-[#8b949e]"
                  }`}
                >
                  <RoleBadge role="COORDINATOR" />
                  Coordinator
                </button>
                <button
                  type="button"
                  onClick={() => setTargetRole("MEMBER")}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md border text-sm font-medium transition-colors cursor-pointer ${
                    targetRole === "MEMBER"
                      ? "bg-[rgba(63,185,80,0.1)] border-[rgba(63,185,80,0.4)] text-[#3fb950]"
                      : "bg-[#0d1117] border-[#30363d] text-[#6e7681] hover:text-[#e6edf3] hover:border-[#8b949e]"
                  }`}
                >
                  <RoleBadge role="MEMBER" />
                  Member
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#8b949e]">Inviting as</label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-md">
                <RoleBadge role="MEMBER" />
                <span className="text-xs text-[#8b949e]">Basic club member access</span>
              </div>
            </div>
          )}

          {/* Club selector — admin only */}
          {isAdmin && (
            <div className="space-y-1.5">
              <label htmlFor="club-select" className="text-xs font-medium text-[#8b949e]">
                Club <span className="text-[#f85149]">*</span>
              </label>
              <select
                id="club-select"
                value={selectedClubId}
                onChange={(e) => setSelectedClubId(e.target.value)}
                className="gh-select w-full py-2"
                disabled={loading}
              >
                {clubs.length === 0 && <option value="">No clubs available</option>}
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>{club.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Coordinator club hint */}
          {isCoordinator && user?.club && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#8b949e]">Club</label>
              <div className="px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-md text-sm text-[#e6edf3] flex items-center justify-between">
                <span>{user.club.name}</span>
                <span className="text-xs text-[#6e7681]">auto-assigned</span>
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="expires-days" className="text-xs font-medium text-[#8b949e]">
                Valid for (days)
              </label>
              <input
                id="expires-days"
                type="number"
                min={1}
                max={30}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
                className="gh-input"
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="max-uses" className="text-xs font-medium text-[#8b949e]">
                Max uses
              </label>
              <input
                id="max-uses"
                type="number"
                min={1}
                max={100}
                value={maxUses}
                onChange={(e) => setMaxUses(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                className="gh-input"
                disabled={loading}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="px-3 py-2 rounded-md bg-[rgba(248,81,73,0.1)] border border-[rgba(248,81,73,0.3)] text-sm text-[#f85149]">
              {error}
            </div>
          )}

          {/* Generated link */}
          {generatedLink && (
            <div className="px-3 py-3 rounded-md bg-[rgba(63,185,80,0.1)] border border-[rgba(63,185,80,0.3)] space-y-2 animate-fade-in">
              <p className="text-xs font-medium text-[#3fb950]">✓ Invite link created!</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="flex-1 px-2 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-md text-xs text-[#8b949e] font-mono truncate"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="gh-btn gh-btn-default gh-btn-sm shrink-0"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="gh-btn gh-btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating…
              </span>
            ) : (
              "Generate invite link"
            )}
          </button>
        </form>

        {/* Active links */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[#e6edf3]">
            Active invite links
            <span className="ml-2 text-xs text-[#8b949e] font-normal">
              {links.filter((l) => !isExpired(l.expiresAt) && !isMaxed(l)).length} active
            </span>
          </h3>

          {linksLoading ? (
            <div className="border border-[#30363d] rounded-md overflow-hidden">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 skeleton border-b border-[#21262d] last:border-b-0" />
              ))}
            </div>
          ) : links.length === 0 ? (
            <div className="bg-[#161b22] border border-[#30363d] rounded-md p-8 text-center text-sm text-[#8b949e]">
              No invite links created yet
            </div>
          ) : (
            <div className="border border-[#30363d] rounded-md overflow-hidden">
              {links.map((link) => {
                const expired = isExpired(link.expiresAt);
                const maxed = isMaxed(link);
                const inactive = expired || maxed;
                const daysLeft = Math.ceil((new Date(link.expiresAt).getTime() - Date.now()) / 86400000);
                const wasCopied = copiedLinkId === link.id;

                return (
                  <div
                    key={link.id}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-[#21262d] last:border-b-0 ${inactive ? "opacity-40" : ""}`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${inactive ? "bg-[#6e7681]" : "bg-[#3fb950]"}`} />
                    <RoleBadge role={link.role} />
                    {link.club && (
                      <span className="text-xs text-[#8b949e] truncate">{link.club.name}</span>
                    )}
                    <span className="text-xs text-[#6e7681] tabular-nums">
                      {link.usedCount}/{link.maxUses} used
                    </span>
                    <div className="flex items-center gap-2 ml-auto shrink-0">
                      <span className={`text-xs ${expired ? "text-[#f85149]" : "text-[#6e7681]"}`}>
                        {expired ? "Expired" : `${daysLeft}d left`}
                      </span>
                      {/* Copy button — always visible for non-expired links */}
                      {!expired && (
                        <button
                          onClick={() => handleCopyLink(link)}
                          className="text-xs text-[#58a6ff] hover:underline cursor-pointer"
                        >
                          {wasCopied ? "Copied!" : "Copy link"}
                        </button>
                      )}
                      {!inactive && (
                        <button
                          onClick={() => handleRevoke(link.id)}
                          className="text-xs text-[#f85149] hover:underline cursor-pointer"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </RoleGate>
  );
}
