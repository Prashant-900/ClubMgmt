"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { listContributions, approveContribution, rejectContribution } from "@/lib/api/contribution.api";
import { CategoryBadge } from "@/components/ui/Badge";
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
      const res = await listContributions({ status: "PENDING", limit: 50 }, token ?? undefined);
      if (res.data) setContributions(res.data.contributions);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message ?? "Failed to load pending contributions");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

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
      <div className="border border-[#30363d] rounded-md overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-4 border-b border-[#21262d] last:border-b-0">
            <div className="w-8 h-8 skeleton rounded-md shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-2/3 skeleton rounded" />
              <div className="h-3 w-1/2 skeleton rounded" />
            </div>
            <div className="flex gap-2">
              <div className="w-16 h-7 skeleton rounded-md" />
              <div className="w-14 h-7 skeleton rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-3 rounded-md bg-[rgba(248,81,73,0.1)] border border-[rgba(248,81,73,0.3)] text-sm text-[#f85149]">
        {error}
      </div>
    );
  }

  if (contributions.length === 0) {
    return (
      <div className="bg-[#161b22] border border-[#30363d] rounded-md p-12 text-center">
        <div className="w-10 h-10 rounded-full bg-[rgba(63,185,80,0.15)] border border-[rgba(63,185,80,0.3)] flex items-center justify-center mx-auto mb-3">
          <svg className="w-5 h-5 text-[#3fb950]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm text-[#8b949e]">All caught up — no pending approvals</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Count banner */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[rgba(210,153,34,0.15)] border border-[rgba(210,153,34,0.4)] text-[#d29922]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#d29922]" />
          {contributions.length} pending review
        </span>
      </div>

      {/* List */}
      <div className="border border-[#30363d] rounded-md overflow-hidden">
        {contributions.map((c, index) => (
          <div
            key={c.id}
            className="border-b border-[#21262d] last:border-b-0 animate-fade-in"
            style={{ animationDelay: `${index * 30}ms`, animationFillMode: "both" }}
          >
            {/* Main row */}
            <div className="flex items-start gap-3 px-4 py-3">
              {/* Hours badge */}
              <div className="shrink-0 w-9 h-9 rounded-md bg-[#161b22] border border-[#30363d] flex flex-col items-center justify-center">
                <span className="text-[13px] font-bold text-[#e6edf3] leading-none tabular-nums">
                  {c.hours % 1 === 0 ? c.hours : c.hours.toFixed(1)}
                </span>
                <span className="text-[8px] text-[#6e7681] uppercase tracking-wider">hrs</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#e6edf3] leading-snug">{c.title}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#8b949e]">
                  <span>{c.user?.name ?? c.user?.email}</span>
                  <span>·</span>
                  <CategoryBadge category={c.category} />
                  <span>·</span>
                  <span>
                    {new Date(c.datePerformed).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </span>
                  {(c.user as { club?: { name: string } }).club && (
                    <>
                      <span>·</span>
                      <span className="text-[#58a6ff]">{(c.user as { club?: { name: string } }).club?.name}</span>
                    </>
                  )}
                </div>
                {c.description && (
                  <p className="text-xs text-[#6e7681] mt-1 line-clamp-1">{c.description}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleApprove(c.id)}
                  disabled={actionLoading === c.id}
                  className="gh-btn gh-btn-primary gh-btn-sm disabled:opacity-50"
                >
                  {actionLoading === c.id ? "…" : "Approve"}
                </button>
                <button
                  onClick={() => setRejectId(rejectId === c.id ? null : c.id)}
                  disabled={actionLoading === c.id}
                  className="gh-btn gh-btn-default gh-btn-sm disabled:opacity-50 text-[#f85149] border-[rgba(248,81,73,0.4)] hover:bg-[rgba(248,81,73,0.1)]"
                >
                  Reject
                </button>
              </div>
            </div>

            {/* Rejection panel */}
            {rejectId === c.id && (
              <div className="px-4 pb-3 pt-0 bg-[#161b22] animate-fade-in">
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection (optional)…"
                  rows={2}
                  className="gh-input text-sm resize-none mb-2"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReject(c.id)}
                    disabled={actionLoading === c.id}
                    className="gh-btn gh-btn-danger gh-btn-sm disabled:opacity-50"
                  >
                    Confirm reject
                  </button>
                  <button
                    onClick={() => { setRejectId(null); setRejectReason(""); }}
                    className="gh-btn gh-btn-default gh-btn-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
