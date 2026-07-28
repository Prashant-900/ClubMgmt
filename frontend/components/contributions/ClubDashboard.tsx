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
    <div className="bg-[#161b22] border border-[#30363d] rounded-md p-4">
      <p className="text-xs font-medium text-[#8b949e] uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-2xl font-bold ${accent} leading-none`}>{value}</p>
      {sub && <p className="text-xs text-[#6e7681] mt-1">{sub}</p>}
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
        <span className="text-xs text-[#e6edf3] font-medium">{getCategoryLabel(category as never)}</span>
        <span className="text-[#8b949e]">
          {hours % 1 === 0 ? hours : hours.toFixed(1)} hrs · {count} entries
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[#21262d] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#26a641] transition-all duration-700"
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
      <div className="px-4 py-3 rounded-md bg-[rgba(248,81,73,0.1)] border border-[rgba(248,81,73,0.3)] text-sm text-[#f85149]">
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
        <div className="bg-[#161b22] border border-[#30363d] rounded-md p-5">
          <h3 className="text-sm font-semibold text-[#e6edf3] mb-4">Category Breakdown</h3>
          {data.categoryBreakdown.length === 0 ? (
            <p className="text-xs text-[#8b949e] py-4 text-center">No approved contributions yet</p>
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
        <div className="bg-[#161b22] border border-[#30363d] rounded-md p-5">
          <h3 className="text-sm font-semibold text-[#e6edf3] mb-4">Top Contributors</h3>
          {data.topContributors.length === 0 ? (
            <p className="text-xs text-[#8b949e] py-4 text-center">No contributors yet</p>
          ) : (
            <div className="space-y-3">
              {data.topContributors.map((entry, i) => (
                <div key={entry.user?.id ?? i} className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0
                      ${i === 0 ? "bg-[rgba(210,153,34,0.2)] text-[#d29922]" : i === 1 ? "bg-[rgba(139,148,158,0.2)] text-[#8b949e]" : i === 2 ? "bg-[rgba(255,123,114,0.2)] text-[#ff7b72]" : "bg-[#21262d] text-[#6e7681]"}`}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#e6edf3] truncate">
                      {entry.user?.name ?? entry.user?.email ?? "Unknown"}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#3fb950] shrink-0">
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
        <div className="bg-[#161b22] border border-[#30363d] rounded-md p-5">
          <h3 className="text-sm font-semibold text-[#e6edf3] mb-4">Weekly Trend (last 8 weeks)</h3>
          <div className="flex items-end gap-1.5 h-24">
            {(() => {
              const maxH = Math.max(...data.weeklyTrend.map((w) => Number(w.hours)), 1);
              return data.weeklyTrend.map((w, i) => {
                const pct = (Number(w.hours) / maxH) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className="w-full rounded-t-sm bg-[#26a641] transition-all duration-500 min-h-[2px]"
                      style={{ height: `${Math.max(pct, 3)}%` }}
                    />
                     <span className="text-[9px] text-[#6e7681] hidden group-hover:block absolute -bottom-4">
                      {Number(w.hours).toFixed(1)}h
                    </span>
                  </div>
                );
              });
            })()}
          </div>
          <div className="flex justify-between text-[10px] text-[#6e7681] mt-5">
            <span>8 weeks ago</span>
            <span>This week</span>
          </div>
        </div>
      )}

      {/* Recent contributions */}
      {data.recentContributions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[#e6edf3] mb-3">Recent Activity</h3>
          <div className="border border-[#30363d] rounded-md overflow-hidden">
            {data.recentContributions.slice(0, 6).map((c, i) => (
              <ContributionCard key={c.id} contribution={c} index={i} showUser />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
