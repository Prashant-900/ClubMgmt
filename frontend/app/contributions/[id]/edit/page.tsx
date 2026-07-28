"use client";

/**
 * Edit a contribution — `/contributions/[id]/edit`
 *
 * Only the owner may edit, and only while the contribution is still PENDING.
 * The server enforces both rules (403 for a non-owner, 400 once reviewed);
 * this page checks them up front so a locked contribution renders a read-only
 * explanation instead of a form the user cannot submit.
 */

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/providers/AuthGuard";
import { useAuth } from "@/components/providers/AuthProvider";
import { getContributionById } from "@/lib/api/contribution.api";
import {
  ContributionForm,
  toFormValues,
} from "@/components/contributions/ContributionForm";
import { StatusBadge } from "@/components/ui/Badge";
import type { Contribution } from "@/types";

interface ApiError {
  message?: string;
  status?: number;
}

/** Read-only explanation shown when the contribution cannot be edited. */
function LockedNotice({
  contributionId,
  heading,
  message,
  status,
}: {
  contributionId: string;
  heading: string;
  message: string;
  status?: Contribution["status"];
}) {
  return (
    <div className="bg-gh-canvas-subtle border border-gh-border-default rounded-md p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gh-text-primary">
          {heading}
        </h2>
        {status && <StatusBadge status={status} />}
      </div>

      <p
        role="alert"
        className="flex items-start gap-2 px-3 py-2 rounded-md bg-gh-warning-muted border border-gh-warning-emphasis/40 text-sm text-gh-warning-fg"
      >
        <svg
          className="w-4 h-4 shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
        <span>{message}</span>
      </p>

      <Link
        href={`/contributions/${contributionId}`}
        className="gh-btn gh-btn-default gh-btn-sm
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-accent-emphasis
                   focus-visible:ring-offset-2 focus-visible:ring-offset-gh-canvas-subtle"
      >
        View contribution
      </Link>
    </div>
  );
}

function EditContributionContent({ id }: { id: string }) {
  const { token, user } = useAuth();

  const [contribution, setContribution] = useState<Contribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getContributionById(id, token ?? undefined);
      setContribution(res.data ?? null);
    } catch (err: unknown) {
      setContribution(null);
      setError(
        typeof err === "object" && err !== null ? (err as ApiError) : {}
      );
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    load();
  }, [load]);

  const isOwner = Boolean(
    contribution && user && contribution.user?.id === user.id
  );
  const isPending = contribution?.status === "PENDING";
  const canEdit = isOwner && isPending;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/contributions/${id}`}
          className="inline-flex items-center gap-2 text-xs text-gh-text-secondary hover:text-gh-text-primary transition-colors mb-4
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-accent-emphasis rounded-sm"
        >
          ← Back to contribution
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold text-gh-text-primary leading-snug">
          Edit contribution
        </h1>
        <p className="text-sm text-gh-text-secondary mt-1">
          Change the details of a contribution that is still awaiting review.
        </p>
      </div>

      {loading ? (
        <div
          className="bg-gh-canvas-subtle border border-gh-border-default rounded-md p-5 space-y-5"
          aria-busy="true"
          aria-live="polite"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-24 rounded-md skeleton" />
              <div className="h-9 w-full rounded-md skeleton" />
            </div>
          ))}
          <div className="h-9 w-full rounded-md skeleton" />
          <p className="sr-only">Loading contribution…</p>
        </div>
      ) : error ? (
        <div className="bg-gh-canvas-subtle border border-gh-border-default rounded-md p-5 space-y-4">
          <p
            role="alert"
            className="px-3 py-2 rounded-md bg-gh-danger-muted border border-gh-danger-emphasis/40 text-sm text-gh-danger-fg"
          >
            {error.status === 404
              ? "This contribution no longer exists."
              : (error.message ?? "Failed to load this contribution.")}
          </p>
          <Link
            href="/contributions"
            className="gh-btn gh-btn-default gh-btn-sm
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-accent-emphasis
                       focus-visible:ring-offset-2 focus-visible:ring-offset-gh-canvas-subtle"
          >
            Back to contributions
          </Link>
        </div>
      ) : !contribution ? null : !isOwner ? (
        <LockedNotice
          contributionId={id}
          heading={contribution.title}
          status={contribution.status}
          message="Only the member who submitted a contribution can edit it. You can still view the full record."
        />
      ) : !isPending ? (
        <LockedNotice
          contributionId={id}
          heading={contribution.title}
          status={contribution.status}
          message={
            contribution.status === "APPROVED"
              ? "This contribution has already been approved, so it can no longer be edited. Ask a coordinator if something needs to change."
              : "This contribution has already been rejected, so it can no longer be edited. Submit a new one with the corrected details."
          }
        />
      ) : canEdit ? (
        <div className="bg-gh-canvas-subtle border border-gh-border-default rounded-md p-5">
          <ContributionForm
            mode="edit"
            contributionId={id}
            initialValues={toFormValues(contribution)}
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * `params` is a promise in this version of Next.js. This page needs the auth
 * token from `localStorage`, so it is a client component and unwraps the
 * promise with React's `use()` rather than `await`.
 */
export default function EditContributionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <AuthGuard>
      <EditContributionContent id={id} />
    </AuthGuard>
  );
}
