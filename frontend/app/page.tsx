"use client";

import { AuthGuard } from "@/components/providers/AuthGuard";
import { useAuth } from "@/components/providers/AuthProvider";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState, useCallback } from "react";
import { type HeatmapDay } from "@/components/ui/ContributionHeatmap";
import { Avatar } from "@/components/ui/Avatar";
import { RoleBadge, StatusBadge, CategoryBadge } from "@/components/ui/Badge";
import { PageTabs } from "@/components/ui/PageTabs";
import { MemberGrid } from "@/components/members/MemberGrid";
import { ContributionList } from "@/components/contributions/ContributionList";
import { ClubDashboard } from "@/components/contributions/ClubDashboard";
import { Leaderboard } from "@/components/contributions/Leaderboard";
import { AdminMembersOverview } from "@/components/members/AdminMembersOverview";
import { ClubGrid } from "@/components/clubs/ClubGrid";
import {
  listMyContributions,
  listContributions,
  getLeaderboard,
  getGlobalAnalytics,
} from "@/lib/api/contribution.api";
import { listMembers } from "@/lib/api/member.api";
import { useClubApi } from "@/lib/hooks/useClubApi";
import { getApiErrorMessage } from "@/lib/hooks/apiError";
import type { Contribution, Club, EnrichedClub, User } from "@/types";
import Link from "next/link";

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildHeatmap(contributions: Contribution[]): HeatmapDay[] {
  const map = new Map<string, HeatmapDay>();
  contributions.forEach((c) => {
    const date = c.datePerformed.slice(0, 10);
    const existing = map.get(date);
    if (existing) {
      existing.count += 1;
      existing.hours += c.hours;
    } else {
      map.set(date, { date, count: 1, hours: c.hours });
    }
  });
  return Array.from(map.values());
}

// ── Quick stat card ────────────────────────────────────────────────────────────

/** One sidebar statistic. `error`/`onRetry` let a single failed stat degrade alone. */
interface SidebarStat {
  label: string;
  value: string | number;
  error?: string | null;
  onRetry?: () => void;
}

function StatItem({ label, value, error, onRetry }: SidebarStat) {
  return (
    <div>
      <dt className="text-xs text-[#8b949e]">{label}</dt>
      <dd className="text-sm font-semibold text-[#e6edf3] mt-0.5 flex items-center gap-2">
        {value}
        {error && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            title={error}
            className="text-[11px] font-normal text-[#58a6ff] hover:underline cursor-pointer"
          >
            retry
          </button>
        )}
      </dd>
    </div>
  );
}

// ── Recent contribution row ────────────────────────────────────────────────────

function ContributionRow({ c }: { c: Contribution }) {
  return (
    <Link
      href={`/contributions/${c.id}`}
      className="flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-md hover:bg-[#161b22] transition-colors group"
    >
      <StatusBadge status={c.status} />
      <span className="flex-1 text-sm text-[#e6edf3] truncate group-hover:text-[#58a6ff] transition-colors">
        {c.title}
      </span>
      <span className="text-xs text-[#8b949e] shrink-0 tabular-nums">
        {c.hours % 1 === 0 ? c.hours : c.hours.toFixed(1)}h
      </span>
      <CategoryBadge category={c.category} className="hidden sm:inline-flex" />
    </Link>
  );
}

// ── Profile sidebar (shared by member, coordinator, admin) ────────────────────

interface ProfileSidebarProps {
  user: User;
  stats: SidebarStat[];
  heatmapData: HeatmapDay[];
  heatmapLabel?: string;
}

function ProfileSidebar({ user, stats, heatmapData, heatmapLabel }: ProfileSidebarProps) {
  const bio =
    user.role === "COORDINATOR"
      ? `${user.club?.name ?? "Club"} Coordinator`
      : user.role === "ADMIN"
      ? "System Administrator"
      : `Member of ${user.club?.name ?? "a club"}`;

  return (
    <aside className="w-full">
      {/* Avatar */}
      <div className="flex flex-col items-center sm:items-start gap-4">
        <Avatar name={user.name} email={user.email} role={user.role} size="xl" />
        <div>
          <h1 className="text-xl font-bold text-[#e6edf3] leading-tight">
            {user.name ?? "Unnamed"}
          </h1>
          <p className="text-sm text-[#8b949e] mt-0.5">{user.email}</p>
          <RoleBadge role={user.role} className="mt-2" />
        </div>
      </div>

      {/* Bio / designation */}
      <div className="mt-4 pb-4 border-b border-[#21262d]">
        <p className="text-sm text-[#8b949e]">{bio}</p>
        {user.club && (
          <p className="text-sm text-[#8b949e] mt-1">
            <span className="text-[#6e7681] mr-1">◆</span>
            {user.club.name}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="mt-4 pb-4 border-b border-[#21262d] space-y-3">
        <h2 className="text-xs font-semibold text-[#8b949e] uppercase tracking-widest">
          Stats
        </h2>
        <dl className="space-y-2">
          {stats.map((s) => (
            <StatItem
              key={s.label}
              label={s.label}
              value={s.value}
              error={s.error}
              onRetry={s.onRetry}
            />
          ))}
        </dl>
      </div>

    </aside>
  );
}

// ── MEMBER / COORDINATOR home view ─────────────────────────────────────────────

function MemberHome() {
  const { user, token } = useAuth();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [contributionsError, setContributionsError] = useState<string | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [rankError, setRankError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setContributionsError(null);
    setRankError(null);

    // allSettled: a failing leaderboard must not blank the contribution list,
    // and vice versa — the two are unrelated.
    const [contribRes, lbRes] = await Promise.allSettled([
      listMyContributions({ limit: 100 }, token ?? undefined),
      getLeaderboard({ period: "all", limit: 100 }, token ?? undefined),
    ]);

    if (contribRes.status === "fulfilled") {
      setContributions(contribRes.value.data?.contributions ?? []);
    } else {
      setContributions([]);
      setContributionsError(
        getApiErrorMessage(contribRes.reason, "Failed to load your contributions")
      );
    }

    if (lbRes.status === "fulfilled") {
      const entry = lbRes.value.data?.entries.find((e) => e.user?.id === user.id);
      setRank(entry?.rank ?? null);
    } else {
      setRank(null);
      setRankError(getApiErrorMessage(lbRes.reason, "Rank unavailable"));
    }

    setLoading(false);
  }, [user, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!user) return null;

  const approved = contributions.filter((c) => c.status === "APPROVED");
  const pending = contributions.filter((c) => c.status === "PENDING");
  const totalHours = approved.reduce((s, c) => s + c.hours, 0);
  const heatmapData = buildHeatmap(contributions);
  const recent = [...contributions]
    .sort((a, b) => new Date(b.datePerformed).getTime() - new Date(a.datePerformed).getTime())
    .slice(0, 8);

  const stats: SidebarStat[] = [
    {
      label: "Total Hours",
      value: contributionsError
        ? "—"
        : totalHours % 1 === 0
        ? `${totalHours}h`
        : `${totalHours.toFixed(1)}h`,
    },
    { label: "Approved", value: contributionsError ? "—" : approved.length },
    { label: "Pending", value: contributionsError ? "—" : pending.length },
    {
      label: "Club Rank",
      value: rank != null ? `#${rank}` : "—",
      error: rankError,
      onRetry: rankError ? loadData : undefined,
    },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left sidebar */}
        <div className="md:w-[260px] shrink-0">
          {loading ? (
            <div className="space-y-4">
              <div className="w-20 h-20 rounded-full skeleton mx-auto md:mx-0" />
              <div className="h-5 w-32 skeleton" />
              <div className="h-4 w-48 skeleton" />
            </div>
          ) : (
            <ProfileSidebar user={user} stats={stats} heatmapData={heatmapData} />
          )}
        </div>

        {/* Right content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Recent contributions */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#e6edf3]">Recent contributions</h2>
              <Link
                href="/contributions"
                className="text-xs text-[#58a6ff] hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="bg-[#161b22] border border-[#30363d] rounded-md px-3 py-1">
              {loading ? (
                <div className="space-y-2 py-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-8 skeleton rounded" />
                  ))}
                </div>
              ) : contributionsError ? (
                <div className="py-6 flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
                  <p className="text-sm text-[#f85149]">{contributionsError}</p>
                  <button
                    type="button"
                    onClick={loadData}
                    className="gh-btn gh-btn-default gh-btn-sm min-h-[36px]"
                  >
                    Retry
                  </button>
                </div>
              ) : recent.length === 0 ? (
                <div className="py-8 text-center text-sm text-[#8b949e]">
                  No contributions yet.{" "}
                  <Link href="/contributions/submit" className="text-[#58a6ff] hover:underline">
                    Submit your first one
                  </Link>
                </div>
              ) : (
                <div>
                  {recent.map((c) => (
                    <ContributionRow key={c.id} c={c} />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Club members */}
          {user.club && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[#e6edf3]">Club members</h2>
              </div>
              <div className="bg-[#161b22] border border-[#30363d] rounded-md p-4">
                <MemberGrid clubId={user.club.id} />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ADMIN home view ─────────────────────────────────────────────────────────────

function AdminHome() {
  const { user, token } = useAuth();
  const { listEnrichedClubs } = useClubApi();

  const [clubs, setClubs] = useState<EnrichedClub[]>([]);
  const [clubsError, setClubsError] = useState<string | null>(null);
  const [clubsLoading, setClubsLoading] = useState(true);

  const [totalMembers, setTotalMembers] = useState<number | null>(null);
  const [pendingUsersCount, setPendingUsersCount] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [totalHours, setTotalHours] = useState<number | null>(null);
  const [recentContributions, setRecentContributions] = useState<Contribution[]>([]);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [activeSection, setActiveSection] = useState<"clubs" | "members">("clubs");

  const loadData = useCallback(async () => {
    setClubsLoading(true);
    setStatsLoading(true);
    setClubsError(null);
    setStatsError(null);

    // allSettled — the club grid and each sidebar counter are independent, so a
    // single failing endpoint must not blank the entire dashboard.
    // The club cards come from ONE enriched request (no per-club follow-ups).
    const [clubsRes, membersRes, pendingUsersRes, pendingApprovalsRes, analyticsRes] =
      await Promise.allSettled([
        listEnrichedClubs(),
        listMembers({ limit: 1 }, token ?? undefined),
        listMembers({ clubStatus: "pending", limit: 1 }, token ?? undefined),
        listContributions({ status: "PENDING", limit: 1 }, token ?? undefined),
        getGlobalAnalytics(undefined, token ?? undefined),
      ]);

    if (clubsRes.status === "fulfilled") {
      setClubs(clubsRes.value.data ?? []);
    } else {
      setClubs([]);
      setClubsError(getApiErrorMessage(clubsRes.reason, "Failed to load clubs"));
    }
    setClubsLoading(false);

    let anyStatFailed = false;

    if (membersRes.status === "fulfilled") {
      setTotalMembers(membersRes.value.data?.pagination.total ?? 0);
    } else {
      setTotalMembers(null);
      anyStatFailed = true;
    }

    if (pendingUsersRes.status === "fulfilled") {
      setPendingUsersCount(pendingUsersRes.value.data?.pagination.total ?? 0);
    } else {
      setPendingUsersCount(null);
      anyStatFailed = true;
    }

    if (pendingApprovalsRes.status === "fulfilled") {
      setPendingCount(pendingApprovalsRes.value.data?.pagination.total ?? 0);
    } else {
      setPendingCount(null);
      anyStatFailed = true;
    }

    if (analyticsRes.status === "fulfilled") {
      setTotalHours(analyticsRes.value.data?.stats.totalApprovedHours ?? 0);
      setRecentContributions(analyticsRes.value.data?.recentContributions ?? []);
    } else {
      setTotalHours(null);
      setRecentContributions([]);
      anyStatFailed = true;
    }

    setStatsError(anyStatFailed ? "Could not be loaded" : null);
    setStatsLoading(false);
  }, [token, listEnrichedClubs]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /** Merge an edited club back into the list in place — no refetch. */
  const handleClubUpdated = useCallback((updated: Club) => {
    setClubs((prev) =>
      prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
    );
  }, []);

  if (!user) return null;

  const heatmapData = buildHeatmap(recentContributions);
  const formatHours = (h: number) => (h % 1 === 0 ? `${h}h` : `${h.toFixed(1)}h`);

  // Each stat degrades on its own: a failed fetch shows "—" plus a retry link.
  const sidebarStats: SidebarStat[] = [
    {
      label: "Total Clubs",
      value: clubsError ? "—" : clubs.length,
      error: clubsError,
      onRetry: clubsError ? loadData : undefined,
    },
    {
      label: "Total Members",
      value: totalMembers ?? "—",
      error: totalMembers == null ? statsError : null,
      onRetry: totalMembers == null ? loadData : undefined,
    },
    {
      label: "Pending Users",
      value: pendingUsersCount ?? "—",
      error: pendingUsersCount == null ? statsError : null,
      onRetry: pendingUsersCount == null ? loadData : undefined,
    },
    {
      label: "Pending Approvals",
      value: pendingCount ?? "—",
      error: pendingCount == null ? statsError : null,
      onRetry: pendingCount == null ? loadData : undefined,
    },
    {
      label: "Total Hours",
      value: totalHours == null ? "—" : formatHours(totalHours),
      error: totalHours == null ? statsError : null,
      onRetry: totalHours == null ? loadData : undefined,
    },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left sidebar */}
        <div className="md:w-[260px] shrink-0">
          {statsLoading ? (
            <div className="space-y-4">
              <div className="w-20 h-20 rounded-full skeleton mx-auto md:mx-0" />
              <div className="h-5 w-32 skeleton" />
              <div className="h-4 w-48 skeleton" />
            </div>
          ) : (
            <ProfileSidebar
              user={user}
              stats={sidebarStats}
              heatmapData={heatmapData}
              heatmapLabel="global contributions"
            />
          )}
        </div>

        {/* Right content */}
        <div className="flex-1 min-w-0">
          {/* Section tabs */}
          <div className="flex items-center gap-1 mb-5 border-b border-[#21262d]">
            <button
              onClick={() => setActiveSection("clubs")}
              className={`px-3 py-2 text-sm font-medium transition-colors cursor-pointer border-b-2 ${
                activeSection === "clubs"
                  ? "border-[#f78166] text-[#e6edf3]"
                  : "border-transparent text-[#8b949e] hover:text-[#e6edf3]"
              }`}
            >
              Clubs
              <span className="ml-1.5 text-xs text-[#8b949e] font-normal">
                {clubsLoading ? "…" : clubs.length}
              </span>
            </button>
            <button
              onClick={() => setActiveSection("members")}
              className={`px-3 py-2 text-sm font-medium transition-colors cursor-pointer border-b-2 relative ${
                activeSection === "members"
                  ? "border-[#f78166] text-[#e6edf3]"
                  : "border-transparent text-[#8b949e] hover:text-[#e6edf3]"
              }`}
            >
              Members
              {(pendingUsersCount ?? 0) > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold rounded-full bg-[#e3b341] text-[#0d1117] px-1">
                  {pendingUsersCount}
                </span>
              )}
            </button>
          </div>

          {activeSection === "clubs" && (
            <ClubGrid
              clubs={clubs}
              loading={clubsLoading}
              error={clubsError}
              onRefresh={loadData}
              onClubUpdated={handleClubUpdated}
            />
          )}

          {activeSection === "members" && <AdminMembersOverview />}
        </div>
      </div>
    </div>
  );
}

// ── ADMIN Club drill-down ──────────────────────────────────────────────────────

type ClubTab = "overview" | "members" | "contributions" | "analytics" | "events";

function ClubDrilldown({ clubId }: { clubId: string }) {
  const router = useRouter();
  const { listEnrichedClubs } = useClubApi();
  const [activeTab, setActiveTab] = useState<ClubTab>("overview");
  const [club, setClub] = useState<EnrichedClub | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // One enriched request covers the club record *and* its member count; the
  // old version also pulled 500 contributions to build a heatmap nothing rendered.
  const loadClub = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listEnrichedClubs();
      setClub((res.data ?? []).find((c) => c.id === clubId) ?? null);
    } catch (err: unknown) {
      setClub(null);
      setError(getApiErrorMessage(err, "Failed to load club"));
    } finally {
      setLoading(false);
    }
  }, [clubId, listEnrichedClubs]);

  useEffect(() => {
    loadClub();
  }, [loadClub]);

  const memberCount = club?.memberCount ?? 0;

  const TABS: { id: ClubTab; label: string }[] = [
    { id: "overview",      label: "Overview" },
    { id: "members",       label: "Members" },
    { id: "contributions", label: "Contributions" },
    { id: "analytics",     label: "Analytics" },
    { id: "events",        label: "Events" },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
      {/* Back + header */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 text-sm text-[#58a6ff] hover:underline mb-4 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Clubs
        </button>

        {loading ? (
          <div className="space-y-2">
            <div className="h-7 w-48 skeleton rounded" />
            <div className="h-4 w-64 skeleton rounded" />
          </div>
        ) : error ? (
          <div className="px-4 py-3 rounded-md bg-[rgba(248,81,73,0.1)] border border-[rgba(248,81,73,0.3)] text-sm text-[#f85149] flex items-center justify-between gap-4">
            <span>{error}</span>
            <button
              type="button"
              onClick={loadClub}
              className="gh-btn gh-btn-default gh-btn-sm min-h-[36px] shrink-0"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-start gap-4">
            <div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#8b949e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <h1 className="text-xl font-bold text-[#e6edf3]">{club?.name ?? "Club"}</h1>
              </div>
              {club?.description && (
                <p className="text-sm text-[#8b949e] mt-1.5 max-w-2xl">{club.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-[#8b949e]">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {memberCount} member{memberCount !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#3fb950]" />
                  Active
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <PageTabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="mb-6"
      />

      {/* Tab content */}
      <div className="animate-fade-in" key={activeTab}>
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-[#e6edf3] mb-3">Leaderboard</h3>
              <Leaderboard clubId={clubId} />
            </div>
          </div>
        )}
        {activeTab === "members" && <MemberGrid clubId={clubId} />}
        {activeTab === "contributions" && (
          <ContributionList clubId={clubId} showUser emptyMessage="No contributions in this club yet." />
        )}
        {activeTab === "analytics" && <ClubDashboard clubId={clubId} />}
        {activeTab === "events" && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-md p-12 text-center">
            <p className="text-sm text-[#8b949e]">Events coming soon</p>
            <p className="text-xs text-[#6e7681] mt-1">Event management is under development</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────

function DashboardContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const urlClubId = searchParams.get("clubId");

  if (!user) return null;

  if (user.role === "ADMIN" && urlClubId) {
    return <ClubDrilldown clubId={urlClubId} />;
  }

  if (user.role === "ADMIN") {
    return <AdminHome />;
  }

  return <MemberHome />;
}

export default function HomePage() {
  return (
    <AuthGuard>
      <Suspense fallback={
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
          <div className="h-8 w-48 skeleton rounded mb-8" />
          <div className="grid grid-cols-2 gap-6">
            <div className="h-64 skeleton rounded-md" />
            <div className="h-64 skeleton rounded-md" />
          </div>
        </div>
      }>
        <DashboardContent />
      </Suspense>
    </AuthGuard>
  );
}
