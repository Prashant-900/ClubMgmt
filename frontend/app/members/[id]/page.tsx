"use client";

/**
 * Member profile — `/members/[id]`
 *
 * Shows one member's identity, contribution stats, recent contributions,
 * invite lineage, and a year-long contribution heatmap.
 *
 * Visibility is enforced by the API (`GET /api/members/:id`): admins may view
 * anyone, coordinators and members only people in their own club, and everyone
 * may always view themselves. This page renders the 403 and 404 cases as
 * explanatory states rather than bare errors.
 */

import { use, useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/providers/AuthGuard";
import { useAuth } from "@/components/providers/AuthProvider";
import { getMemberProfile } from "@/lib/api/member.api";
import { getContributionHeatmap } from "@/lib/api/contribution.api";
import { HeatmapGrid } from "@/components/contributions/HeatmapGrid";
import { Avatar } from "@/components/ui/Avatar";
import { RoleBadge, StatusBadge, CategoryBadge } from "@/components/ui/Badge";
import type {
  HeatmapResponse,
  MemberProfile,
  MemberStats,
  Role,
  User,
} from "@/types";

/** Shape `apiRequest` rejects with. */
interface ApiError {
  message?: string;
  status?: number;
}

function toApiError(err: unknown): ApiError {
  return typeof err === "object" && err !== null ? (err as ApiError) : {};
}

function formatHours(hours: number): string {
  return hours % 1 === 0 ? String(hours) : hours.toFixed(1);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ── Small building blocks ─────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent = "text-gh-text-primary",
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-gh-canvas-subtle border border-gh-border-default rounded-md p-4">
      <p className="text-xs font-medium text-gh-text-secondary uppercase tracking-wider mb-2">
        {label}
      </p>
      <p className={`text-2xl font-bold leading-none ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-gh-text-tertiary mt-1">{sub}</p>}
    </div>
  );
}

function MetaField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gh-text-secondary mb-0.5">
        {label}
      </p>
      <div className="text-sm text-gh-text-primary font-medium">{children}</div>
    </div>
  );
}

function SectionCard({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="bg-gh-canvas-subtle border border-gh-border-default rounded-md p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-gh-text-primary">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** One row in the invite lineage list. */
function MemberLink({
  member,
}: {
  member: Pick<User, "id" | "email" | "name" | "role">;
}) {
  return (
    <Link
      href={`/members/${member.id}`}
      className="flex items-center gap-3 px-3 py-2 rounded-md border border-gh-border-muted
                 hover:border-gh-border-default hover:bg-gh-canvas-inset transition-colors
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-accent-emphasis"
    >
      <Avatar
        name={member.name}
        email={member.email}
        role={member.role}
        size="xs"
      />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-gh-text-primary truncate">
          {member.name ?? member.email}
        </span>
        <span className="block text-xs text-gh-text-secondary truncate">
          {member.email}
        </span>
      </span>
      <RoleBadge role={member.role} />
    </Link>
  );
}

// ── States ────────────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div
      className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="h-4 w-40 rounded-md skeleton" />

      <div className="bg-gh-canvas-subtle border border-gh-border-default rounded-md p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full skeleton shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-48 rounded-md skeleton" />
            <div className="h-4 w-64 rounded-md skeleton" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-gh-border-muted">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-20 rounded-md skeleton" />
              <div className="h-4 w-28 rounded-md skeleton" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 rounded-md skeleton" />
        ))}
      </div>

      <div className="h-48 rounded-md skeleton" />
      <div className="h-56 rounded-md skeleton" />
      <p className="sr-only">Loading member profile…</p>
    </div>
  );
}

function BlockedState({
  title,
  message,
  tone,
}: {
  title: string;
  message: string;
  tone: "warning" | "danger";
}) {
  const toneClasses =
    tone === "warning"
      ? "bg-gh-warning-muted border-gh-warning-emphasis/40 text-gh-warning-fg"
      : "bg-gh-danger-muted border-gh-danger-emphasis/40 text-gh-danger-fg";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-4">
      <div className="bg-gh-canvas-subtle border border-gh-border-default rounded-md p-5 space-y-3">
        <h1 className="text-xl font-semibold text-gh-text-primary">{title}</h1>
        <p
          role="alert"
          className={`flex items-start gap-2 px-4 py-3 rounded-md border text-sm ${toneClasses}`}
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
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <span>{message}</span>
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs text-gh-text-secondary hover:text-gh-text-primary transition-colors
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-accent-emphasis rounded-sm"
        >
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}

// ── Page content ──────────────────────────────────────────────────────────────

function MemberProfileContent({ memberId }: { memberId: string }) {
  const { token, user } = useAuth();

  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [heatmapError, setHeatmapError] = useState<string | null>(null);

  const isSelf = user?.id === memberId;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHeatmapError(null);

    // One failing request must not blank the other half of the page.
    const [profileResult, heatmapResult] = await Promise.allSettled([
      getMemberProfile(memberId, token ?? undefined),
      getContributionHeatmap({ userId: memberId }, token ?? undefined),
    ]);

    if (profileResult.status === "fulfilled") {
      setProfile(profileResult.value.data ?? null);
    } else {
      setProfile(null);
      setError(toApiError(profileResult.reason));
    }

    if (heatmapResult.status === "fulfilled") {
      setHeatmap(heatmapResult.value.data ?? null);
    } else {
      setHeatmap(null);
      setHeatmapError(
        toApiError(heatmapResult.reason).message ?? "Failed to load activity"
      );
    }

    setLoading(false);
  }, [memberId, token]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <ProfileSkeleton />;

  if (error) {
    if (error.status === 403) {
      return (
        <BlockedState
          tone="warning"
          title="Profile not available"
          message="You can only view members from your own club."
        />
      );
    }
    if (error.status === 404) {
      return (
        <BlockedState
          tone="warning"
          title="Member not found"
          message="No member exists with this ID. They may have been removed."
        />
      );
    }
    return (
      <BlockedState
        tone="danger"
        title="Could not load profile"
        message={error.message ?? "Something went wrong loading this member."}
      />
    );
  }

  if (!profile) return null;

  // Defensive default: the typed contract always includes `stats`, but a
  // partially-deployed API would otherwise crash the whole page here.
  const stats: MemberStats = profile.stats ?? {
    totalContributions: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    approvedHours: 0,
    recentContributions: [],
  };
  const displayName = profile.name ?? profile.email;
  const invitees = profile.invitees ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs text-gh-text-secondary hover:text-gh-text-primary transition-colors
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-accent-emphasis rounded-sm"
      >
        ← Back to dashboard
      </Link>

      {/* Identity */}
      <section className="bg-gh-canvas-subtle border border-gh-border-default rounded-md p-5">
        <div className="flex items-start gap-4">
          <Avatar
            name={profile.name}
            email={profile.email}
            role={profile.role}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-semibold text-gh-text-primary leading-snug">
              {isSelf ? "Your profile" : displayName}
            </h1>
            {isSelf && (
              <p className="text-sm text-gh-text-secondary mt-0.5 truncate">
                {displayName}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <RoleBadge role={profile.role} />
              {!profile.isVerified && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gh-warning-muted border border-gh-warning-emphasis/40 text-gh-warning-fg">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-gh-warning-fg"
                    aria-hidden="true"
                  />
                  Unverified
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5 pt-5 border-t border-gh-border-muted">
          <MetaField label="Email">
            <a
              href={`mailto:${profile.email}`}
              className="text-role-coordinator hover:underline break-all
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-accent-emphasis rounded-sm"
            >
              {profile.email}
            </a>
          </MetaField>
          <MetaField label="Phone">
            {profile.phone ? (
              <a
                href={`tel:${profile.phone}`}
                className="text-role-coordinator hover:underline
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-accent-emphasis rounded-sm"
              >
                {profile.phone}
              </a>
            ) : (
              <span className="text-gh-text-tertiary">Not provided</span>
            )}
          </MetaField>
          <MetaField label="Role">{roleLabel(profile.role)}</MetaField>
          <MetaField label="Club">
            {profile.club?.name ?? (
              <span className="text-gh-text-tertiary">No club assigned</span>
            )}
          </MetaField>
          <MetaField label="Joined">{formatDate(profile.createdAt)}</MetaField>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="Approved hours"
          value={formatHours(stats.approvedHours)}
          sub="Credited"
          accent="text-gh-success-fg"
        />
        <StatCard
          label="Contributions"
          value={stats.totalContributions}
          sub="All time"
          accent="text-role-coordinator"
        />
        <StatCard
          label="Approved"
          value={stats.approvedCount}
          sub="Reviewed"
          accent="text-gh-success-fg"
        />
        <StatCard
          label="Pending"
          value={stats.pendingCount}
          sub="Awaiting review"
          accent="text-gh-warning-fg"
        />
        <StatCard
          label="Rejected"
          value={stats.rejectedCount}
          sub="Needs rework"
          accent="text-gh-danger-fg"
        />
      </div>

      {/* Heatmap */}
      <SectionCard title="Contribution activity">
        {heatmapError ? (
          <p
            role="alert"
            className="px-3 py-2 rounded-md bg-gh-danger-muted border border-gh-danger-emphasis/40 text-sm text-gh-danger-fg"
          >
            {heatmapError}
          </p>
        ) : heatmap ? (
          <HeatmapGrid
            days={heatmap.days ?? []}
            totalContributions={heatmap.totalContributions ?? 0}
            totalHours={heatmap.totalHours ?? 0}
            maxHours={heatmap.maxHours ?? 0}
            subjectPrefix={isSelf ? "you" : (profile.name ?? profile.email)}
          />
        ) : (
          <p className="text-sm text-gh-text-secondary">
            No contribution history yet.
          </p>
        )}
      </SectionCard>

      {/* Recent contributions */}
      <SectionCard
        title="Recent contributions"
        action={
          stats.totalContributions > 0 ? (
            <Link
              href="/contributions"
              className="text-xs text-gh-text-secondary hover:text-gh-text-primary transition-colors
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-accent-emphasis rounded-sm"
            >
              All contributions →
            </Link>
          ) : undefined
        }
      >
        {stats.recentContributions.length === 0 ? (
          <p className="text-sm text-gh-text-secondary">
            {isSelf
              ? "You haven't logged any contributions yet."
              : "This member hasn't logged any contributions yet."}
          </p>
        ) : (
          <ul className="border border-gh-border-muted rounded-md overflow-hidden">
            {stats.recentContributions.map((c) => (
              <li
                key={c.id}
                className="border-b border-gh-border-muted last:border-b-0"
              >
                <Link
                  href={`/contributions/${c.id}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-gh-canvas-inset transition-colors group
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gh-accent-emphasis"
                >
                  <span className="shrink-0 mt-0.5">
                    <StatusBadge status={c.status} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-medium text-gh-text-primary leading-snug">
                        {c.title}
                      </span>
                      <CategoryBadge category={c.category} />
                    </span>
                    <span className="block text-xs text-gh-text-secondary mt-1">
                      {formatDate(c.datePerformed)}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-gh-text-primary tabular-nums">
                    {formatHours(c.hours)}
                    <span className="text-xs font-normal text-gh-text-secondary ml-0.5">
                      h
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* Invite lineage */}
      {(profile.invitedBy || invitees.length > 0) && (
        <SectionCard title="Invite lineage">
          <div className="space-y-5">
            {profile.invitedBy && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gh-text-secondary">
                  Invited by
                </p>
                <MemberLink member={profile.invitedBy} />
              </div>
            )}
            {invitees.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gh-text-secondary">
                  Invited {invitees.length}{" "}
                  {invitees.length === 1 ? "member" : "members"}
                </p>
                <div className="space-y-2">
                  {invitees.map((invitee) => (
                    <MemberLink key={invitee.id} member={invitee} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrator",
  COORDINATOR: "Club coordinator",
  MEMBER: "Member",
};

function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}

/**
 * `params` is a promise in this version of Next.js, so it is unwrapped with
 * React's `use()` — this page is a client component (it needs the auth token
 * from `localStorage`) and therefore cannot be `async`.
 */
export default function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <AuthGuard>
      <MemberProfileContent memberId={id} />
    </AuthGuard>
  );
}
