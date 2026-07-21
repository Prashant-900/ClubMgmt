"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getClubAnalytics } from "@/lib/api/contribution.api";
import { ContributionCard, getCategoryLabel } from "./ContributionCard";
import type { ClubAnalytics } from "@/types";

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

function CategoryBar({
  category,
  hours,
  maxHours,
  count,
}: {
  category: string;
  hours: number;
  maxHours: number;
  count: number;
}) {
  const pct = maxHours > 0 ? Math.round((hours / maxHours) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-300 font-medium">{getCategoryLabel(category as never)}</span>
        <span className="text-gray-500">
          {hours % 1 === 0 ? hours : hours.toFixed(1)} hrs · {count} entries
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
}

interface ClubDashboardProps {
  clubId?: string; // For ADMIN scoping; COORDINATOR uses own club
}

export function ClubDashboard({ clubId }: ClubDashboardProps) {
  const { token } = useAuth();
  const [data, setData] = useState<ClubAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const res = await getClubAnalytics(clubId, token ?? undefined);
        if (res.data) setData(res.data);
      } catch (err: unknown) {
        const e = err as { message?: string };
        setError(e?.message ?? "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [clubId, token]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl skeleton" />
          ))}
        </div>
        <div className="h-48 rounded-2xl skeleton" />
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

  if (!data) return null;

  const maxHours = Math.max(...(data.categoryBreakdown.map((c) => c.totalHours) || [1]), 1);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Approved Hours"
          value={data.stats.totalApprovedHours % 1 === 0 ? data.stats.totalApprovedHours : data.stats.totalApprovedHours.toFixed(1)}
          sub="Total logged"
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
          sub="Total rejected"
          accent="text-red-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category breakdown */}
        <div className="bg-glass border border-glass-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Category Breakdown</h3>
          {data.categoryBreakdown.length === 0 ? (
            <p className="text-xs text-gray-500 py-4 text-center">No approved contributions yet</p>
          ) : (
            <div className="space-y-3.5">
              {data.categoryBreakdown.map((c) => (
                <CategoryBar
                  key={c.category}
                  category={c.category}
                  hours={c.totalHours}
                  maxHours={maxHours}
                  count={c.count}
                />
              ))}
            </div>
          )}
        </div>

        {/* Top contributors */}
        <div className="bg-glass border border-glass-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Top Contributors</h3>
          {data.topContributors.length === 0 ? (
            <p className="text-xs text-gray-500 py-4 text-center">No contributors yet</p>
          ) : (
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
                  </div>
                  <span className="text-xs font-semibold text-violet-300 shrink-0">
                    {entry.totalHours % 1 === 0 ? entry.totalHours : entry.totalHours.toFixed(1)} hrs
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contribution trend */}
      {data.weeklyTrend.length > 0 && (
        <div className="bg-glass border border-glass-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Weekly Trend (last 8 weeks)</h3>
          <div className="flex items-end gap-1.5 h-24">
            {(() => {
              const maxH = Math.max(...data.weeklyTrend.map((w) => Number(w.hours)), 1);
              return data.weeklyTrend.map((w, i) => {
                const pct = (Number(w.hours) / maxH) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className="w-full rounded-t-sm bg-gradient-to-t from-violet-600 to-indigo-500 transition-all duration-500 min-h-[2px]"
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

      {/* Recent contributions */}
      {data.recentContributions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-200 mb-3">Recent Activity</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.recentContributions.slice(0, 6).map((c, i) => (
              <ContributionCard key={c.id} contribution={c} index={i} showUser />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
