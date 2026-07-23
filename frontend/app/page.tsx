"use client";

import { AuthGuard } from "@/components/providers/AuthGuard";
import { useAuth } from "@/components/providers/AuthProvider";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { ContributionHeatmap, type HeatmapDay } from "@/components/ui/ContributionHeatmap";
import { Avatar } from "@/components/ui/Avatar";
import { RoleBadge, StatusBadge, CategoryBadge } from "@/components/ui/Badge";
import { PageTabs } from "@/components/ui/PageTabs";
import { MemberGrid } from "@/components/members/MemberGrid";
import { ContributionList } from "@/components/contributions/ContributionList";
import { ClubDashboard } from "@/components/contributions/ClubDashboard";
import { Leaderboard } from "@/components/contributions/Leaderboard";
import { AdminMembersOverview } from "@/components/members/AdminMembersOverview";
import { listMyContributions, listContributions, getLeaderboard } from "@/lib/api/contribution.api";
import { listClubs, createClub, deleteClub } from "@/lib/api/club.api";
import { listMembers } from "@/lib/api/member.api";
import type { Contribution, Club, User } from "@/types";
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

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs text-[#8b949e]">{label}</dt>
      <dd className="text-sm font-semibold text-[#e6edf3] mt-0.5">{value}</dd>
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
  stats: { label: string; value: string | number }[];
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
            <StatItem key={s.label} label={s.label} value={s.value} />
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
  const [rank, setRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      listMyContributions({ limit: 200 }, token ?? undefined),
      getLeaderboard({ period: "all", limit: 100 }, token ?? undefined),
    ])
      .then(([contribRes, lbRes]) => {
        const list = contribRes.data?.contributions ?? [];
        setContributions(list);
        // Find my rank
        const entry = lbRes.data?.entries.find((e) => e.user?.id === user.id);
        if (entry) setRank(entry.rank);
      })
      .finally(() => setLoading(false));
  }, [user, token]);

  if (!user) return null;

  const approved = contributions.filter((c) => c.status === "APPROVED");
  const pending = contributions.filter((c) => c.status === "PENDING");
  const totalHours = approved.reduce((s, c) => s + c.hours, 0);
  const heatmapData = buildHeatmap(contributions);
  const recent = [...contributions]
    .sort((a, b) => new Date(b.datePerformed).getTime() - new Date(a.datePerformed).getTime())
    .slice(0, 8);

  const stats = [
    { label: "Total Hours", value: totalHours % 1 === 0 ? `${totalHours}h` : `${totalHours.toFixed(1)}h` },
    { label: "Approved", value: approved.length },
    { label: "Pending", value: pending.length },
    { label: "Club Rank", value: rank != null ? `#${rank}` : "—" },
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

// ── ADMIN — Club card ─────────────────────────────────────────────────────────

interface ClubWithMeta extends Club {
  memberCount?: number;
  coordinatorName?: string;
  totalHours?: number;
}

interface ClubRepoCardProps {
  club: ClubWithMeta;
  onDelete: (club: Club) => void;
  deleting: boolean;
}

function ClubRepoCard({ club, onDelete, deleting }: ClubRepoCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div
      className="bg-[#161b22] border border-[#30363d] rounded-md p-4 hover:border-[#8b949e] transition-colors group"
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => router.push(`/?clubId=${club.id}`)}
        >
          <div className="flex items-center gap-2">
            {/* Repo icon */}
            <svg className="w-4 h-4 text-[#8b949e] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span className="text-sm font-semibold text-[#58a6ff] group-hover:underline truncate">
              {club.name}
            </span>
          </div>
          <p className="text-xs text-[#8b949e] mt-2 line-clamp-2 leading-relaxed">
            {club.coordinatorName
              ? `Coordinated by ${club.coordinatorName}`
              : "No coordinator assigned"}
          </p>
        </div>

        {/* Three-dot menu */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="w-7 h-7 flex items-center justify-center text-[#6e7681] hover:text-[#e6edf3] hover:bg-[#21262d] rounded-md transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM1.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm13 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-[#161b22] border border-[#30363d] rounded-md shadow-lg z-20 animate-scale-in py-1">
              <button
                onClick={() => { router.push(`/?clubId=${club.id}`); setMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-[#e6edf3] hover:bg-[#21262d] transition-colors cursor-pointer"
              >
                View Club
              </button>
              <div className="border-t border-[#21262d] my-1" />
              <button
                disabled={deleting}
                onClick={() => { onDelete(club); setMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-[#f85149] hover:bg-[rgba(248,81,73,0.1)] transition-colors cursor-pointer disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete Club"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer stats */}
      <div className="flex items-center gap-4 mt-4 text-xs text-[#8b949e]">
        {club.memberCount != null && (
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {club.memberCount} member{club.memberCount !== 1 ? "s" : ""}
          </span>
        )}
        {club.totalHours != null && club.totalHours > 0 && (
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {club.totalHours % 1 === 0 ? club.totalHours : club.totalHours.toFixed(1)}h logged
          </span>
        )}
        <span className="ml-auto flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#3fb950]" />
          Active
        </span>
      </div>
    </div>
  );
}

// ── ADMIN home view ─────────────────────────────────────────────────────────────

function AdminHome() {
  const { user, token } = useAuth();
  const [clubs, setClubs] = useState<ClubWithMeta[]>([]);
  const [allContributions, setAllContributions] = useState<Contribution[]>([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newClubName, setNewClubName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeSection, setActiveSection] = useState<"clubs" | "members">("clubs");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [clubsRes, membersRes, pendingUsersRes, pendingRes, contribRes] = await Promise.all([
        listClubs(),
        listMembers({ limit: 1 }, token ?? undefined),
        listMembers({ clubStatus: "pending", limit: 1 }, token ?? undefined),
        listContributions({ status: "PENDING", limit: 1 }, token ?? undefined),
        listContributions({ limit: 500 }, token ?? undefined),
      ]);

      const rawClubs: Club[] = clubsRes.data ?? [];
      setTotalMembers(membersRes.data?.pagination.total ?? 0);
      setPendingUsersCount(pendingUsersRes.data?.pagination.total ?? 0);
      setPendingCount(pendingRes.data?.pagination.total ?? 0);
      const allC = contribRes.data?.contributions ?? [];
      setAllContributions(allC);

      // Enrich clubs with member counts
      const enriched: ClubWithMeta[] = await Promise.all(
        rawClubs.map(async (club) => {
          const mRes = await listMembers({ clubId: club.id, limit: 1 }, token ?? undefined);
          const count = mRes.data?.pagination.total ?? 0;
          // Find coordinator from members
          const membersRes2 = await listMembers({ clubId: club.id, role: "COORDINATOR", limit: 1 }, token ?? undefined);
          const coord = membersRes2.data?.members?.[0];
          const clubHours = allC
            .filter((c) => c.club?.id === club.id && c.status === "APPROVED")
            .reduce((s, c) => s + c.hours, 0);
          return {
            ...club,
            memberCount: count,
            coordinatorName: coord?.name ?? coord?.email ?? undefined,
            totalHours: clubHours,
          };
        })
      );
      setClubs(enriched);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (club: Club) => {
    if (!confirm(`Delete "${club.name}"? This will remove the club, unassign its members, and delete related invite links and contributions.`)) return;
    setDeletingId(club.id);
    try {
      await deleteClub(club.id, token ?? undefined);
      await loadData();
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newClubName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const res = await createClub(name, token ?? undefined);
      if (res.success) {
        setNewClubName("");
        setShowCreateForm(false);
        await loadData();
      }
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? (err as { message: string }).message : "Failed to create club";
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  if (!user) return null;

  const heatmapData = buildHeatmap(allContributions);
  const totalHours = allContributions
    .filter((c) => c.status === "APPROVED")
    .reduce((s, c) => s + c.hours, 0);

  const sidebarStats = [
    { label: "Total Clubs",      value: clubs.length },
    { label: "Total Members",    value: totalMembers },
    { label: "Pending Users",    value: pendingUsersCount },
    { label: "Pending Approvals",value: pendingCount },
    { label: "Total Hours",      value: totalHours % 1 === 0 ? `${totalHours}h` : `${totalHours.toFixed(1)}h` },
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
              <span className="ml-1.5 text-xs text-[#8b949e] font-normal">{clubs.length}</span>
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
              {pendingUsersCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold rounded-full bg-[#e3b341] text-[#0d1117] px-1">
                  {pendingUsersCount}
                </span>
              )}
            </button>
          </div>
          {activeSection === "clubs" && (
            <>
              {/* Clubs header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[#e6edf3]">
                  Clubs
                  <span className="ml-2 text-xs text-[#8b949e] font-normal">{clubs.length}</span>
                </h2>
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="gh-btn gh-btn-primary gh-btn-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  New Club
                </button>
              </div>

              {/* Create club form */}
              {showCreateForm && (
                <form
                  onSubmit={handleCreate}
                  className="bg-[#161b22] border border-[#30363d] rounded-md p-4 mb-4 animate-fade-in"
                >
                  <label className="block mb-2">
                    <span className="text-xs text-[#8b949e] font-medium">Club name</span>
                    <input
                      value={newClubName}
                      onChange={(e) => setNewClubName(e.target.value)}
                      placeholder="e.g. GDG on Campus"
                      className="gh-input mt-1.5"
                      autoFocus
                    />
                  </label>
                  {error && <p className="text-xs text-[#f85149] mb-2">{error}</p>}
                  <div className="flex gap-2 mt-3">
                    <button type="submit" disabled={creating} className="gh-btn gh-btn-primary gh-btn-sm">
                      {creating ? "Creating…" : "Create club"}
                    </button>
                    <button type="button" onClick={() => setShowCreateForm(false)} className="gh-btn gh-btn-default gh-btn-sm">
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Club cards grid */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-32 skeleton rounded-md" />
                  ))}
                </div>
              ) : clubs.length === 0 ? (
                <div className="bg-[#161b22] border border-[#30363d] rounded-md p-12 text-center">
                  <p className="text-sm text-[#8b949e]">No clubs yet. Create one to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {clubs.map((club) => (
                    <ClubRepoCard
                      key={club.id}
                      club={club}
                      onDelete={handleDelete}
                      deleting={deletingId === club.id}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {activeSection === "members" && (
            <AdminMembersOverview />
          )}
        </div>
      </div>
    </div>
  );
}

// ── ADMIN Club drill-down ──────────────────────────────────────────────────────

type ClubTab = "overview" | "members" | "contributions" | "analytics" | "events";

function ClubDrilldown({ clubId }: { clubId: string }) {
  const { token } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ClubTab>("overview");
  const [club, setClub] = useState<Club | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      listClubs(),
      listMembers({ clubId, limit: 1 }, token ?? undefined),
      listContributions({ clubId, limit: 500 }, token ?? undefined),
    ]).then(([clubsRes, membersRes, contribRes]) => {
      const foundClub = (clubsRes.data ?? []).find((c) => c.id === clubId);
      setClub(foundClub ?? null);
      setMemberCount(membersRes.data?.pagination.total ?? 0);
      const contributions = contribRes.data?.contributions ?? [];
      setHeatmapData(buildHeatmap(contributions));
    }).finally(() => setLoading(false));
  }, [clubId, token]);

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
        ) : (
          <div className="flex flex-wrap items-start gap-4">
            <div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#8b949e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <h1 className="text-xl font-bold text-[#e6edf3]">{club?.name ?? "Club"}</h1>
              </div>
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
