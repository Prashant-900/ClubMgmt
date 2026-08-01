"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getGlobalAnalytics } from "@/lib/api/contribution.api";
import { ContributionCard, getCategoryLabel } from "./ContributionCard";
import type { GlobalAnalytics, Club } from "@/types";

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="relative bg-white border border-[#dadce0] rounded-2xl p-4 pl-5 overflow-hidden ui-card-hover">
      <span className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: color }} />
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <p className="text-xs font-medium text-[#5f6368] uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-3xl font-bold text-[#202124] leading-none font-display">{value}</p>
      {sub && <p className="text-xs text-[#80868b] mt-1.5">{sub}</p>}
    </div>
  );
}

interface GlobalDashboardProps {
  clubs?: Club[];
}

export function GlobalDashboard({ clubs = [] }: GlobalDashboardProps) {
  const { token } = useAuth();
  const [selectedClubId, setSelectedClubId] = useState("");
  const [data, setData] = useState<GlobalAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const res = await getGlobalAnalytics(selectedClubId || undefined, token ?? undefined);
        if (res.data) setData(res.data);
      } catch (err: unknown) {
        const e = err as { message?: string };
        setError(e?.message ?? "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [selectedClubId, token]);

  return (
    <div className="space-y-6">
      {/* Club filter */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="global-club-filter"
          className="text-xs font-medium text-gh-text-secondary shrink-0"
        >
          View
        </label>
        <select
          id="global-club-filter"
          value={selectedClubId}
          onChange={(e) => setSelectedClubId(e.target.value)}
          className="gh-select focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-accent-emphasis"
        >
          <option value="">All clubs</option>
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {selectedClubId && (
          <button
            onClick={() => setSelectedClubId("")}
            className="gh-btn gh-btn-default gh-btn-sm
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-accent-emphasis
                       focus-visible:ring-offset-2 focus-visible:ring-offset-gh-canvas-default"
          >
            Clear filter
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-6" aria-busy="true" aria-live="polite">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-md skeleton" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-56 rounded-md skeleton" />
            <div className="h-56 rounded-md skeleton" />
          </div>
          <p className="sr-only">Loading analytics…</p>
        </div>
      ) : error ? (
        <div
          role="alert"
          className="px-4 py-3 rounded-md bg-gh-danger-muted border border-gh-danger-emphasis/40 text-sm text-gh-danger-fg"
        >
          {error}
        </div>
      ) : data ? (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Total Hours"
              value={
                data.stats.totalApprovedHours % 1 === 0
                  ? data.stats.totalApprovedHours
                  : data.stats.totalApprovedHours.toFixed(1)
              }
              sub="Approved"
              color="#34a853"
            />
            <StatCard
              label="Contributions"
              value={data.stats.totalApproved}
              sub="Approved"
              color="#4285f4"
            />
            <StatCard
              label="Pending"
              value={data.stats.totalPending}
              sub="Awaiting review"
              color="#fbbc05"
            />
            <StatCard
              label="Rejected"
              value={data.stats.totalRejected}
              sub="Total"
              color="#ea4335"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top clubs */}
            {!selectedClubId && data.topClubs.length > 0 && (
              <div className="bg-white border border-[#dadce0] rounded-2xl p-5 ui-card-hover">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gh-text-primary mb-4">
                  <span className="w-1 h-4 rounded-full bg-[#4285f4]" />
                  Top Clubs
                </h3>
                <div className="space-y-3">
                  {data.topClubs.map((entry, i) => {
                    const maxH = Math.max(...data.topClubs.map((e) => e.totalHours), 1);
                    const pct = Math.round((entry.totalHours / maxH) * 100);
                    const barColor = ["#4285f4", "#34a853", "#fbbc05", "#ea4335"][i % 4];
                    return (
                      <div key={entry.club?.id ?? i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-gh-text-primary">
                            {i + 1}. {entry.club?.name ?? "Unknown"}
                          </span>
                          <span className="text-gh-text-secondary">
                            {entry.totalHours % 1 === 0 ? entry.totalHours : entry.totalHours.toFixed(1)} hrs
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-gh-border-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: barColor }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Category distribution */}
            {data.categoryBreakdown.length > 0 && (
              <div className="bg-white border border-[#dadce0] rounded-2xl p-5 ui-card-hover">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gh-text-primary mb-4">
                  <span className="w-1 h-4 rounded-full bg-[#34a853]" />
                  Category Distribution
                </h3>
                <div className="space-y-3">
                  {data.categoryBreakdown.map((c, ci) => {
                    const maxH = Math.max(...data.categoryBreakdown.map((x) => x.totalHours), 1);
                    const pct = Math.round((c.totalHours / maxH) * 100);
                    const barColor = ["#4285f4", "#34a853", "#fbbc05", "#ea4335", "#1a73e8", "#188038"][ci % 6];
                    return (
                      <div key={c.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-gh-text-primary font-medium">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: barColor }} />
                            {getCategoryLabel(c.category)}
                          </span>
                          <span className="text-gh-text-secondary">
                            {c.totalHours % 1 === 0 ? c.totalHours : c.totalHours.toFixed(1)} hrs · {c.count}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-gh-border-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: barColor }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top contributors */}
            {data.topContributors.length > 0 && (
              <div className="bg-white border border-[#dadce0] rounded-2xl p-5 ui-card-hover">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gh-text-primary mb-4">
                  <span className="w-1 h-4 rounded-full bg-[#ea4335]" />
                  Top Contributors
                </h3>
                <div className="space-y-3">
                  {data.topContributors.map((entry, i) => (
                    <div key={entry.user?.id ?? i} className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
                          ${i === 0 ? "bg-gh-warning-muted text-gh-warning-fg" : i === 1 ? "bg-gh-border-muted text-gh-text-secondary" : i === 2 ? "bg-gh-danger-muted text-gh-danger-fg" : "bg-gh-border-muted text-gh-text-tertiary"}`}
                      >
                        <span className="sr-only">Rank </span>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gh-text-primary truncate">
                          {entry.user?.name ?? entry.user?.email ?? "Unknown"}
                        </p>
                        {entry.user?.club?.name && (
                          <p className="text-[10px] text-gh-text-secondary">{entry.user.club.name}</p>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-gh-success-fg shrink-0">
                        {entry.totalHours % 1 === 0 ? entry.totalHours : entry.totalHours.toFixed(1)} hrs
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weekly trend */}
            {data.weeklyTrend.length > 0 && (
              <div className="bg-white border border-[#dadce0] rounded-2xl p-5 ui-card-hover">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gh-text-primary mb-4">
                  <span className="w-1 h-4 rounded-full bg-[#fbbc05]" />
                  Weekly Trend
                </h3>
                <div className="flex items-end gap-1.5 h-24" role="group" aria-label="Approved hours per week">
                  {(() => {
                    const maxH = Math.max(...data.weeklyTrend.map((w) => Number(w.hours)), 1);
                    return data.weeklyTrend.map((w, i) => {
                      const hours = Number(w.hours);
                      const pct = (hours / maxH) * 100;
                      // The value lives in title/aria-label rather than a
                      // hover-only tooltip so it is reachable on touch too.
                      const label = `Week of ${w.week}: ${hours.toFixed(1)} hours across ${w.count} contribution${w.count === 1 ? "" : "s"}`;
                      return (
                        <div
                          key={i}
                          role="img"
                          title={label}
                          aria-label={label}
                          className="flex-1 flex flex-col justify-end h-full"
                        >
                          <div
                            className="w-full rounded-t-sm bg-gh-success-emphasis transition-all duration-500 min-h-[2px]"
                            style={{ height: `${Math.max(pct, 3)}%` }}
                          />
                        </div>
                      );
                    });
                  })()}
                </div>
                <div className="flex justify-between text-[10px] text-gh-text-tertiary mt-3">
                  <span>8 weeks ago</span>
                  <span>This week</span>
                </div>
              </div>
            )}
          </div>

          {/* Recent contributions */}
          {data.recentContributions.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gh-text-primary mb-4">
                <span className="w-1 h-4 rounded-full bg-[#1a73e8]" />
                Recent Activity
              </h3>
              <div className="bg-white border border-[#dadce0] rounded-2xl overflow-hidden">
                {data.recentContributions.slice(0, 6).map((c, i) => (
                  <ContributionCard key={c.id} contribution={c} index={i} showUser showClub />
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
