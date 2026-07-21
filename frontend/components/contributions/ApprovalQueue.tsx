"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  listContributions,
  approveContribution,
  rejectContribution,
} from "@/lib/api/contribution.api";
import { getCategoryLabel, getCategoryColor } from "./ContributionCard";
import type { Contribution } from "@/types";

export function ApprovalQueue() {
  const { token } = useAuth();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listContributions(
        { status: "PENDING", limit: 50 },
        token ?? undefined
      );
      if (res.data) setContributions(res.data.contributions);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message ?? "Failed to load pending contributions");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  async function handleApprove(id: string) {
    setActionLoading(id);
    try {
      await approveContribution(id, token ?? undefined);
      setContributions((prev) => prev.filter((c) => c.id !== id));
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message ?? "Failed to approve");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(id: string) {
    setActionLoading(id);
    try {
      await rejectContribution(id, rejectReason || undefined, token ?? undefined);
      setContributions((prev) => prev.filter((c) => c.id !== id));
      setRejectId(null);
      setRejectReason("");
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message ?? "Failed to reject");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl skeleton" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
        {error}
      </div>
    );
  }

  if (contributions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm text-gray-500">All caught up — no pending approvals!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          {contributions.length} pending
        </span>
      </div>

      {contributions.map((c, index) => (
        <div
          key={c.id}
          className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-4
                     animate-fade-in transition-all duration-200"
          style={{ animationDelay: `${index * 40}ms`, animationFillMode: "both" }}
        >
          <div className="flex items-start gap-3">
            {/* Hours bubble */}
            <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20
                            border border-violet-500/20 flex flex-col items-center justify-center">
              <span className="text-sm font-bold text-violet-300 leading-none">
                {c.hours % 1 === 0 ? c.hours : c.hours.toFixed(1)}
              </span>
              <span className="text-[8px] text-violet-400/60 uppercase">hrs</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-100 leading-snug">{c.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {c.user?.name ?? c.user?.email}
                    {" · "}
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getCategoryColor(c.category)}`}>
                      {getCategoryLabel(c.category)}
                    </span>
                    {" · "}
                    {new Date(c.datePerformed).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </p>
                  {c.description && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-1">{c.description}</p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(c.id)}
                    disabled={actionLoading === c.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold
                               text-emerald-400 bg-emerald-500/10 border border-emerald-500/20
                               hover:bg-emerald-500/20 disabled:opacity-50
                               transition-all duration-150 cursor-pointer"
                  >
                    {actionLoading === c.id ? "…" : "Approve"}
                  </button>
                  <button
                    onClick={() => setRejectId(rejectId === c.id ? null : c.id)}
                    disabled={actionLoading === c.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold
                               text-red-400 bg-red-500/10 border border-red-500/20
                               hover:bg-red-500/20 disabled:opacity-50
                               transition-all duration-150 cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              </div>

              {/* Rejection reason inline panel */}
              {rejectId === c.id && (
                <div className="mt-3 space-y-2 animate-fade-in">
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Reason for rejection (optional)…"
                    rows={2}
                    className="w-full px-3 py-2 text-xs bg-white/[0.03] border border-red-500/20 rounded-xl
                               text-gray-300 placeholder-gray-600 resize-none
                               focus:outline-none focus:border-red-500/40 transition-all"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReject(c.id)}
                      disabled={actionLoading === c.id}
                      className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white
                                 bg-red-600 hover:bg-red-500 disabled:opacity-50
                                 transition-all duration-150 cursor-pointer"
                    >
                      Confirm Reject
                    </button>
                    <button
                      onClick={() => { setRejectId(null); setRejectReason(""); }}
                      className="px-4 py-1.5 rounded-lg text-xs font-medium text-gray-400
                                 bg-white/[0.03] border border-white/[0.08]
                                 hover:bg-white/[0.06] transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
