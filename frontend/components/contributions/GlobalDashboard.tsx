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
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="bg-glass border border-glass-border rounded-2xl p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-2xl font-bold ${accent} leading-none`}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
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
        <label className="text-xs text-gray-500 font-medium uppercase tracking-wider shrink-0">
          View:
        </label>
        <select
          value={selectedClubId}
          onChange={(e) => setSelectedClubId(e.target.value)}
          className="px-3 py-1.5 rounded-xl text-sm bg-white/[0.03] border border-white/[0.08]
                     text-gray-300 focus:outline-none focus:border-violet-500/50
                     transition-all duration-200 cursor-pointer"
        >
          <option value="" className="bg-[#0f0d1a]">All Clubs</option>
          {clubs.map((c) => (
            <option key={c.id} value={c.id} className="bg-[#0f0d1a] text-gray-100">
              {c.name}
            </option>
          ))}
        </select>
        {selectedClubId && (
          <button
            onClick={() => setSelectedClubId("")}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors cursor-pointer"
          >
            ✕ Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl skeleton" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-56 rounded-2xl skeleton" />
            <div className="h-56 rounded-2xl skeleton" />
          </div>
        </div>
      ) : error ? (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
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
              accent="text-emerald-400"
            />
            <StatCard
              label="Contributions"
              value={data.stats.totalApproved}
              sub="Approved"
              accent="text-violet-400"
            />
            <StatCard
              label="Pending"
              value={data.stats.totalPending}
              sub="Awaiting review"
              accent="text-amber-400"
            />
            <StatCard
              label="Rejected"
              value={data.stats.totalRejected}
              sub="Total"
              accent="text-red-400"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top clubs */}
            {!selectedClubId && data.topClubs.length > 0 && (
              <div className="bg-glass border border-glass-border rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-gray-200 mb-4">Top Clubs</h3>
                <div className="space-y-3">
                  {data.topClubs.map((entry, i) => {
                    const maxH = Math.max(...data.topClubs.map((e) => e.totalHours), 1);
                    const pct = Math.round((entry.totalHours / maxH) * 100);
                    return (
                      <div key={entry.club?.id ?? i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-gray-200">
                            {i + 1}. {entry.club?.name ?? "Unknown"}
                          </span>
                          <span className="text-gray-500">
                            {entry.totalHours % 1 === 0 ? entry.totalHours : entry.totalHours.toFixed(1)} hrs
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700"
                            style={{ width: `${pct}%` }}
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
              <div className="bg-glass border border-glass-border rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-gray-200 mb-4">Category Distribution</h3>
                <div className="space-y-3">
                  {data.categoryBreakdown.map((c) => {
                    const maxH = Math.max(...data.categoryBreakdown.map((x) => x.totalHours), 1);
                    const pct = Math.round((c.totalHours / maxH) * 100);
                    return (
                      <div key={c.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-300 font-medium">{getCategoryLabel(c.category)}</span>
                          <span className="text-gray-500">
                            {c.totalHours % 1 === 0 ? c.totalHours : c.totalHours.toFixed(1)} hrs · {c.count}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-700"
                            style={{ width: `${pct}%` }}
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
              <div className="bg-glass border border-glass-border rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-gray-200 mb-4">Top Contributors</h3>
                <div className="space-y-3">
                  {data.topContributors.map((entry, i) => (
                    <div key={entry.user?.id ?? i} className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0
                          ${i === 0 ? "bg-amber-500/20 text-amber-400" : i === 1 ? "bg-gray-500/20 text-gray-300" : i === 2 ? "bg-orange-600/20 text-orange-400" : "bg-white/[0.05] text-gray-500"}`}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-200 truncate">
                          {entry.user?.name ?? entry.user?.email ?? "Unknown"}
                        </p>
                        {entry.user?.club?.name && (
                          <p className="text-[10px] text-violet-400/70">{entry.user.club.name}</p>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-violet-300 shrink-0">
                        {entry.totalHours % 1 === 0 ? entry.totalHours : entry.totalHours.toFixed(1)} hrs
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weekly trend */}
            {data.weeklyTrend.length > 0 && (
              <div className="bg-glass border border-glass-border rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-gray-200 mb-4">Weekly Trend</h3>
                <div className="flex items-end gap-1.5 h-24">
                  {(() => {
                    const maxH = Math.max(...data.weeklyTrend.map((w) => Number(w.hours)), 1);
                    return data.weeklyTrend.map((w, i) => {
                      const pct = (Number(w.hours) / maxH) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div
                            className="w-full rounded-t-sm bg-gradient-to-t from-cyan-600 to-blue-500 transition-all duration-500 min-h-[2px]"
                            style={{ height: `${Math.max(pct, 3)}%` }}
                          />
                          <span className="text-[9px] text-gray-600 hidden group-hover:block absolute -bottom-4">
                            {Number(w.hours).toFixed(1)}h
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
                <div className="flex justify-between text-[10px] text-gray-600 mt-5">
                  <span>8 weeks ago</span>
                  <span>This week</span>
                </div>
              </div>
            )}
          </div>

          {/* Recent contributions */}
          {data.recentContributions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-200 mb-3">Recent Activity</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
