"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/providers/AuthGuard";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getContributionById,
  approveContribution,
  rejectContribution,
  deleteContribution,
} from "@/lib/api/contribution.api";
import { getStatusConfig, getCategoryLabel, getCategoryColor } from "@/components/contributions/ContributionCard";
import type { Contribution } from "@/types";
import Link from "next/link";

function ContributionDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { token, user } = useAuth();
  const id = params.id as string;

  const [contribution, setContribution] = useState<Contribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const canModerate =
    user?.role === "ADMIN" ||
    (user?.role === "COORDINATOR" && contribution?.club?.id === user?.clubId);
  const canDelete = user?.role === "ADMIN";

  const fetchContribution = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getContributionById(id, token ?? undefined);
      if (res.data) setContribution(res.data);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message ?? "Failed to load contribution");
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchContribution();
  }, [fetchContribution]);

  async function handleApprove() {
    setActionLoading(true);
    try {
      const res = await approveContribution(id, token ?? undefined);
      if (res.data) setContribution(res.data);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message ?? "Failed to approve");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    setActionLoading(true);
    try {
      const res = await rejectContribution(id, rejectReason || undefined, token ?? undefined);
      if (res.data) setContribution(res.data);
      setShowRejectForm(false);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message ?? "Failed to reject");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this contribution? This cannot be undone.")) return;
    setActionLoading(true);
    try {
      await deleteContribution(id, token ?? undefined);
      router.push("/contributions");
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message ?? "Failed to delete");
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 space-y-4">
        <div className="h-8 w-48 rounded skeleton" />
        <div className="h-48 rounded-2xl skeleton" />
        <div className="h-32 rounded-2xl skeleton" />
      </div>
    );
  }

  if (error && !contribution) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
        </div>
      </div>
    );
  }

  if (!contribution) return null;

  const status = getStatusConfig(contribution.status);
  const catColor = getCategoryColor(contribution.category);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
      {/* Back link */}
      <Link
        href="/contributions"
        className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-6"
      >
        ← Back to Contributions
      </Link>

      {/* Main card */}
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 space-y-5">
        {/* Status + category row */}
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${catColor}`}>
            {getCategoryLabel(contribution.category)}
          </span>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-xl font-bold text-gray-100 leading-snug">{contribution.title}</h1>
          {contribution.description && (
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">{contribution.description}</p>
          )}
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.06]">
          <MetaField label="Hours" value={contribution.hours % 1 === 0 ? `${contribution.hours}h` : `${contribution.hours.toFixed(1)}h`} />
          <MetaField
            label="Date Performed"
            value={new Date(contribution.datePerformed).toLocaleDateString("en-IN", {
              day: "numeric", month: "long", year: "numeric",
            })}
          />
          <MetaField label="Submitted By" value={contribution.user?.name ?? contribution.user?.email ?? "Unknown"} />
          <MetaField label="Club" value={contribution.club?.name ?? "—"} />

          {contribution.approvedBy && (
            <MetaField
              label={contribution.status === "REJECTED" ? "Reviewed By" : "Approved By"}
              value={contribution.approvedBy.name ?? contribution.approvedBy.email}
            />
          )}
          {contribution.approvedAt && (
            <MetaField
              label={contribution.status === "REJECTED" ? "Reviewed At" : "Approved At"}
              value={new Date(contribution.approvedAt).toLocaleDateString("en-IN", {
                day: "numeric", month: "long", year: "numeric",
              })}
            />
          )}
        </div>

        {/* Attachment */}
        {contribution.attachmentUrl && (
          <div className="pt-3 border-t border-white/[0.06]">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Attachment</p>
            <a
              href={contribution.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View Attachment
            </a>
          </div>
        )}

        {/* Rejection reason */}
        {contribution.status === "REJECTED" && contribution.rejectionReason && (
          <div className="px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/15">
            <p className="text-xs text-red-400/80 font-medium mb-1">Rejection Reason</p>
            <p className="text-sm text-red-300/80">{contribution.rejectionReason}</p>
          </div>
        )}

        {/* Timestamps */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] text-[11px] text-gray-600">
          <span>Submitted {new Date(contribution.createdAt).toLocaleDateString("en-IN")}</span>
          <span>Updated {new Date(contribution.updatedAt).toLocaleDateString("en-IN")}</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Moderator actions */}
      {canModerate && contribution.status === "PENDING" && (
        <div className="mt-4 bg-glass border border-glass-border rounded-2xl p-5 space-y-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Review</p>

          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold
                         text-emerald-400 bg-emerald-500/10 border border-emerald-500/20
                         hover:bg-emerald-500/20 disabled:opacity-50
                         transition-all duration-200 cursor-pointer"
            >
              {actionLoading ? "…" : "✓ Approve"}
            </button>
            <button
              onClick={() => setShowRejectForm(!showRejectForm)}
              disabled={actionLoading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold
                         text-red-400 bg-red-500/10 border border-red-500/20
                         hover:bg-red-500/20 disabled:opacity-50
                         transition-all duration-200 cursor-pointer"
            >
              ✕ Reject
            </button>
          </div>

          {showRejectForm && (
            <div className="space-y-3 animate-fade-in">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (optional)…"
                rows={3}
                className="w-full px-3 py-2.5 text-sm bg-white/[0.03] border border-red-500/20 rounded-xl
                           text-gray-300 placeholder-gray-600 resize-none
                           focus:outline-none focus:border-red-500/40 transition-all"
              />
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white
                           bg-red-600 hover:bg-red-500 disabled:opacity-50
                           transition-all duration-200 cursor-pointer"
              >
                {actionLoading ? "Rejecting…" : "Confirm Rejection"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Admin delete */}
      {canDelete && (
        <div className="mt-4">
          <button
            onClick={handleDelete}
            disabled={actionLoading}
            className="w-full py-2 rounded-xl text-xs font-medium text-red-400/50
                       bg-red-500/5 border border-red-500/10
                       hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20
                       disabled:opacity-30 transition-all duration-200 cursor-pointer"
          >
            Delete Contribution
          </button>
        </div>
      )}
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-gray-200 font-medium">{value}</p>
    </div>
  );
}

export default function ContributionDetailPage() {
  return (
    <AuthGuard>
      <ContributionDetailContent />
    </AuthGuard>
  );
}
