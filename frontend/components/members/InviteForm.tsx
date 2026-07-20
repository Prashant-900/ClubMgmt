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

  // The role to assign — fixed per the user's own role
  const targetRole: Role = isAdmin ? "COORDINATOR" : "MEMBER";

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

  // Fetch clubs (for admin's club picker)
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

  // Fetch existing links
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

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGeneratedLink(null);
    setCopied(false);

    // Admin must select a club
    if (isAdmin && !selectedClubId) {
      setError("Please select a club for the coordinator.");
      return;
    }

    setLoading(true);
    try {
      const res = await createInviteLink(
        {
          role: targetRole,
          clubId: isAdmin ? selectedClubId : undefined,
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

  const handleCopy = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = generatedLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <p className="text-gray-400 font-medium">Access Denied</p>
          <p className="text-xs text-gray-600 mt-1">
            You don&apos;t have permission to create invite links
          </p>
        </div>
      }
    >
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Context info */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-gray-400">
            {isAdmin ? (
              <>
                As an <span className="text-violet-400 font-medium">Admin</span>, you can create invite links for{" "}
                <span className="text-cyan-400 font-medium">Coordinators</span>. You must select a club.
              </>
            ) : (
              <>
                As a <span className="text-cyan-400 font-medium">Coordinator</span>, you can create invite links for{" "}
                <span className="text-emerald-400 font-medium">Members</span>. They&apos;ll join your club automatically.
              </>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Role indicator (read-only) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Inviting as
            </label>
            <div
              className={`p-4 rounded-xl border text-left
                ${
                  targetRole === "COORDINATOR"
                    ? "border-cyan-500/30 bg-cyan-500/5"
                    : "border-emerald-500/30 bg-emerald-500/5"
                }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    targetRole === "COORDINATOR" ? "bg-cyan-400" : "bg-emerald-400"
                  }`}
                />
                <span className="text-sm font-semibold text-gray-200">
                  {targetRole === "COORDINATOR" ? "Coordinator" : "Member"}
                </span>
              </div>
              <p className="text-xs text-gray-500 ml-4 mt-1">
                {targetRole === "COORDINATOR"
                  ? "Can manage members and create invite links for their club"
                  : "Basic access to club features"}
              </p>
            </div>
          </div>

          {/* Club selector — only for admin */}
          {isAdmin && (
            <div className="space-y-2">
              <label htmlFor="club-select" className="block text-sm font-medium text-gray-300">
                Select Club
              </label>
              <select
                id="club-select"
                value={selectedClubId}
                onChange={(e) => setSelectedClubId(e.target.value)}
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl
                           text-gray-100 text-sm appearance-none cursor-pointer
                           focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10
                           transition-all duration-200"
                disabled={loading}
              >
                {clubs.map((club) => (
                  <option key={club.id} value={club.id} className="bg-[#0f0d1a] text-gray-100">
                    {club.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Coordinator club hint */}
          {isCoordinator && user?.club && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Club
              </label>
              <div className="px-4 py-3 bg-white/[0.02] border border-white/[0.06] rounded-xl text-sm text-gray-400 flex items-center gap-2">
                <svg className="w-4 h-4 text-violet-400/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="text-violet-400 font-medium">{user.club.name}</span>
                <span className="text-gray-600 text-xs ml-auto">auto-assigned</span>
              </div>
            </div>
          )}

          {/* Settings row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="expires-days" className="block text-sm font-medium text-gray-300">
                Valid for (days)
              </label>
              <input
                id="expires-days"
                type="number"
                min={1}
                max={30}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl
                           text-gray-100 text-sm
                           focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10
                           transition-all duration-200"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="max-uses" className="block text-sm font-medium text-gray-300">
                Max uses
              </label>
              <input
                id="max-uses"
                type="number"
                min={1}
                max={100}
                value={maxUses}
                onChange={(e) => setMaxUses(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl
                           text-gray-100 text-sm
                           focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10
                           transition-all duration-200"
                disabled={loading}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 flex items-center gap-2 animate-fade-in">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {error}
            </div>
          )}

          {/* Generated link */}
          {generatedLink && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-emerald-400 font-medium">
                  Invite link created!
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="flex-1 px-3 py-2 bg-black/30 border border-white/[0.06] rounded-lg
                             text-xs text-gray-300 font-mono truncate"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-4 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 
                             text-white rounded-lg transition-colors cursor-pointer shrink-0"
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
            className="w-full py-3 px-4 rounded-xl text-sm font-semibold
                       bg-gradient-to-r from-violet-600 to-indigo-600 text-white
                       hover:from-violet-500 hover:to-indigo-500
                       disabled:opacity-40 disabled:cursor-not-allowed
                       shadow-lg shadow-violet-600/20 hover:shadow-violet-600/30
                       transition-all duration-200 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </span>
            ) : (
              "Generate Invite Link"
            )}
          </button>
        </form>

        {/* Active invite links */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-400">
            Your Invite Links
          </h3>

          {linksLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 skeleton rounded-xl" />
              ))}
            </div>
          )}

          {!linksLoading && links.length === 0 && (
            <p className="text-xs text-gray-600 py-4 text-center">
              No invite links created yet
            </p>
          )}

          {!linksLoading &&
            links.map((link) => {
              const expired = isExpired(link.expiresAt);
              const maxed = isMaxed(link);
              const inactive = expired || maxed;

              return (
                <div
                  key={link.id}
                  className={`px-4 py-3 border rounded-xl transition-all
                    ${inactive
                      ? "bg-white/[0.01] border-white/[0.04] opacity-50"
                      : "bg-white/[0.02] border-white/[0.06]"
                    }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          inactive ? "bg-gray-500" : "bg-emerald-400 shadow-sm shadow-emerald-400/50"
                        }`}
                      />

                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase shrink-0
                          ${link.role === "COORDINATOR"
                            ? "text-cyan-400 bg-cyan-500/15 border border-cyan-500/30"
                            : "text-emerald-400 bg-emerald-500/15 border border-emerald-500/30"
                          }`}
                      >
                        {link.role}
                      </span>

                      {link.club && (
                        <span className="text-[11px] text-violet-400/70 truncate font-medium">
                          {link.club.name}
                        </span>
                      )}

                      <span className="text-[11px] text-gray-600 shrink-0">
                        {link.usedCount}/{link.maxUses} used
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[11px] ${expired ? "text-red-400" : "text-gray-600"}`}>
                        {expired
                          ? "Expired"
                          : `${Math.ceil((new Date(link.expiresAt).getTime() - Date.now()) / 86400000)}d left`}
                      </span>
                      {!inactive && (
                        <button
                          onClick={() => handleRevoke(link.id)}
                          className="px-2 py-1 text-[10px] font-medium text-red-400/60 
                                     hover:text-red-400 hover:bg-red-500/10 
                                     rounded-md transition-all cursor-pointer"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </RoleGate>
  );
}
