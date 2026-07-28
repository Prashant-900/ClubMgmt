"use client";

import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/providers/AuthGuard";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getContributionById,
  approveContribution,
  rejectContribution,
  deleteContribution,
} from "@/lib/api/contribution.api";
import { StatusBadge, CategoryBadge } from "@/components/ui/Badge";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const canModerate =
    user?.role === "ADMIN" ||
    (user?.role === "COORDINATOR" && contribution?.club?.id === user?.clubId);
  const canDelete = user?.role === "ADMIN";
  /** Owners may edit their own work, but only while it is still pending. */
  const canEdit =
    Boolean(user) &&
    contribution?.user?.id === user?.id &&
    contribution?.status === "PENDING";

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
    setActionLoading(true);
    try {
      await deleteContribution(id, token ?? undefined);
      router.push("/contributions");
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message ?? "Failed to delete");
      setShowDeleteConfirm(false);
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-4" aria-busy="true" aria-live="polite">
        <div className="h-4 w-40 rounded-md skeleton" />
        <div className="bg-gh-canvas-subtle border border-gh-border-default rounded-md p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-24 rounded-full skeleton" />
            <div className="h-5 w-20 rounded-md skeleton" />
          </div>
          <div className="h-6 w-3/4 rounded-md skeleton" />
          <div className="h-4 w-full rounded-md skeleton" />
          <div className="grid grid-cols-2 gap-4 pt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-20 rounded-md skeleton" />
                <div className="h-4 w-32 rounded-md skeleton" />
              </div>
            ))}
          </div>
        </div>
        <div className="h-24 rounded-md skeleton" />
        <p className="sr-only">Loading contribution…</p>
      </div>
    );
  }

  if (error && !contribution) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <div
          role="alert"
          className="px-4 py-3 rounded-md bg-gh-danger-muted border border-gh-danger-emphasis/40 text-sm text-gh-danger-fg"
        >
          {error}
        </div>
        <Link
          href="/contributions"
          className="inline-flex items-center gap-2 text-xs text-gh-text-secondary hover:text-gh-text-primary transition-colors
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-accent-emphasis rounded-sm"
        >
          ← Back to contributions
        </Link>
      </div>
    );
  }

  if (!contribution) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Back link */}
      <Link
        href="/contributions"
        className="inline-flex items-center gap-2 text-xs text-gh-text-secondary hover:text-gh-text-primary transition-colors mb-6
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-accent-emphasis rounded-sm"
      >
        ← Back to contributions
      </Link>

      {/* Main card */}
      <div className="bg-gh-canvas-subtle border border-gh-border-default rounded-md p-5 space-y-5">
        {/* Status + category row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusBadge status={contribution.status} />
          <div className="flex items-center gap-2">
            <CategoryBadge category={contribution.category} />
            {canEdit && (
              <Link
                href={`/contributions/${contribution.id}/edit`}
                className="gh-btn gh-btn-default gh-btn-sm
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-accent-emphasis
                           focus-visible:ring-offset-2 focus-visible:ring-offset-gh-canvas-subtle"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                  />
                </svg>
                Edit
              </Link>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-xl font-semibold text-gh-text-primary leading-snug">
            {contribution.title}
          </h1>
          {contribution.description && (
            <p className="text-sm text-gh-text-secondary mt-2 leading-relaxed">
              {contribution.description}
            </p>
          )}
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gh-border-muted">
          <MetaField label="Hours" value={contribution.hours % 1 === 0 ? `${contribution.hours}h` : `${contribution.hours.toFixed(1)}h`} />
          <MetaField
            label="Date Performed"
            value={new Date(contribution.datePerformed).toLocaleDateString("en-IN", {
              day: "numeric", month: "long", year: "numeric",
            })}
          />
          <MetaField
            label="Submitted By"
            value={
              contribution.user?.id ? (
                <Link
                  href={`/members/${contribution.user.id}`}
                  className="text-role-coordinator hover:underline
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-accent-emphasis rounded-sm"
                >
                  {contribution.user.name ?? contribution.user.email}
                </Link>
              ) : (
                "Unknown"
              )
            }
          />
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
          <div className="pt-3 border-t border-gh-border-muted">
            <p className="text-xs font-medium text-gh-text-secondary mb-1">Attachment</p>
            <a
              href={contribution.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-role-coordinator hover:underline
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-accent-emphasis rounded-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View attachment
            </a>
          </div>
        )}

        {/* Rejection reason */}
        {contribution.status === "REJECTED" && contribution.rejectionReason && (
          <div className="px-4 py-3 rounded-md bg-gh-danger-muted border border-gh-danger-emphasis/40">
            <p className="text-xs font-medium text-gh-danger-fg mb-1">Rejection reason</p>
            <p className="text-sm text-gh-text-primary">{contribution.rejectionReason}</p>
          </div>
        )}

        {/* Timestamps */}
        <div className="flex items-center justify-between pt-3 border-t border-gh-border-muted text-xs text-gh-text-tertiary">
          <span>Submitted {new Date(contribution.createdAt).toLocaleDateString("en-IN")}</span>
          <span>Updated {new Date(contribution.updatedAt).toLocaleDateString("en-IN")}</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="mt-4 px-4 py-3 rounded-md bg-gh-danger-muted border border-gh-danger-emphasis/40 text-sm text-gh-danger-fg"
        >
          {error}
        </div>
      )}

      {/* Moderator actions */}
      {canModerate && contribution.status === "PENDING" && (
        <div className="mt-4 bg-gh-canvas-subtle border border-gh-border-default rounded-md p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gh-text-primary border-b border-gh-border-muted pb-3">
            Review
          </h2>

          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="gh-btn gh-btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-accent-emphasis
                         focus-visible:ring-offset-2 focus-visible:ring-offset-gh-canvas-subtle"
            >
              {actionLoading ? "Working…" : "Approve"}
            </button>
            <button
              onClick={() => setShowRejectForm(!showRejectForm)}
              disabled={actionLoading}
              aria-expanded={showRejectForm}
              aria-controls="reject-reason-panel"
              className="gh-btn gh-btn-default flex-1 justify-center text-gh-danger-fg disabled:opacity-50 disabled:cursor-not-allowed
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-accent-emphasis
                         focus-visible:ring-offset-2 focus-visible:ring-offset-gh-canvas-subtle"
            >
              Reject
            </button>
          </div>

          {showRejectForm && (
            <div id="reject-reason-panel" className="space-y-3 animate-fade-in">
              <div className="space-y-1.5">
                <label htmlFor="reject-reason" className="block text-xs font-medium text-gh-text-secondary">
                  Reason for rejection <span className="text-gh-text-tertiary">(optional)</span>
                </label>
                <textarea
                  id="reject-reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Let the contributor know what needs to change…"
                  rows={3}
                  className="gh-input py-2 resize-none"
                />
              </div>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="gh-btn gh-btn-danger w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-accent-emphasis
                           focus-visible:ring-offset-2 focus-visible:ring-offset-gh-canvas-subtle"
              >
                {actionLoading ? "Rejecting…" : "Confirm rejection"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Admin delete */}
      {canDelete && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={actionLoading}
            className="gh-btn gh-btn-danger gh-btn-sm disabled:opacity-50 disabled:cursor-not-allowed
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-accent-emphasis
                       focus-visible:ring-offset-2 focus-visible:ring-offset-gh-canvas-default"
          >
            Delete contribution
          </button>
        </div>
      )}

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete contribution"
        message="This contribution will be permanently removed. This cannot be undone."
        confirmLabel="Delete contribution"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-gh-text-secondary mb-0.5">{label}</p>
      <div className="text-sm text-gh-text-primary font-medium">{value}</div>
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
