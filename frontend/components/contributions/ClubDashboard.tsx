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
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="relative bg-white border border-[#dadce0] rounded-2xl p-4 pl-5 overflow-hidden ui-card-hover">
      {/* colored accent rail */}
      <span
        className="absolute left-0 top-0 bottom-0 w-1.5"
        style={{ backgroundColor: color }}
      />
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <p className="text-xs font-medium text-[#5f6368] uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-3xl font-bold text-[#202124] leading-none font-display">{value}</p>
      {sub && <p className="text-xs text-[#80868b] mt-1.5">{sub}</p>}
    </div>
  );
}

const BAR_COLORS = ["#4285f4", "#34a853", "#fbbc05", "#ea4335", "#1a73e8", "#188038"];

function CategoryBar({
  category,
  hours,
  maxHours,
  count,
  index,
}: {
  category: string;
  hours: number;
  maxHours: number;
  count: number;
  index: number;
}) {
  const pct = maxHours > 0 ? Math.round((hours / maxHours) * 100) : 0;
  const color = BAR_COLORS[index % BAR_COLORS.length];
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-xs text-[#202124] font-medium">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          {getCategoryLabel(category as never)}
        </span>
        <span className="text-[#5f6368]">
          {hours % 1 === 0 ? hours : hours.toFixed(1)} hrs · {count} entries
        </span>
      </div>
      <div className="h-2 rounded-full bg-[#f1f3f4] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
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
      <div className="px-4 py-3 rounded-md bg-[#fce8e6] border border-[rgba(234,67,53,0.3)] text-sm text-[#c5221f]">
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
          sub="Total rejected"
          color="#ea4335"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category breakdown */}
        <div className="bg-white border border-[#dadce0] rounded-2xl p-5 ui-card-hover">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[#202124] mb-4">
            <span className="w-1 h-4 rounded-full bg-[#4285f4]" />
            Category Breakdown
          </h3>
          {data.categoryBreakdown.length === 0 ? (
            <p className="text-xs text-[#5f6368] py-4 text-center">No approved contributions yet</p>
          ) : (
            <div className="space-y-3.5">
              {data.categoryBreakdown.map((c, i) => (
                <CategoryBar
                  key={c.category}
                  category={c.category}
                  hours={c.totalHours}
                  maxHours={maxHours}
                  count={c.count}
                  index={i}
                />
              ))}
            </div>
          )}
        </div>

        {/* Top contributors */}
        <div className="bg-white border border-[#dadce0] rounded-2xl p-5 ui-card-hover">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[#202124] mb-4">
            <span className="w-1 h-4 rounded-full bg-[#34a853]" />
            Top Contributors
          </h3>
          {data.topContributors.length === 0 ? (
            <p className="text-xs text-[#5f6368] py-4 text-center">No contributors yet</p>
          ) : (
            <div className="space-y-3">
              {data.topContributors.map((entry, i) => (
                <div key={entry.user?.id ?? i} className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0
                      ${i === 0 ? "bg-[rgba(251,188,5,0.2)] text-[#b06000]" : i === 1 ? "bg-[rgba(95,99,104,0.2)] text-[#5f6368]" : i === 2 ? "bg-[rgba(234,67,53,0.2)] text-[#c5221f]" : "bg-[#f1f3f4] text-[#80868b]"}`}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#202124] truncate">
                      {entry.user?.name ?? entry.user?.email ?? "Unknown"}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#188038] shrink-0">
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
        <div className="bg-white border border-[#dadce0] rounded-2xl p-5 ui-card-hover">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[#202124] mb-4">
            <span className="w-1 h-4 rounded-full bg-[#fbbc05]" />
            Weekly Trend (last 8 weeks)
          </h3>
          <div className="flex items-end gap-1.5 h-24">
            {(() => {
              const maxH = Math.max(...data.weeklyTrend.map((w) => Number(w.hours)), 1);
              return data.weeklyTrend.map((w, i) => {
                const pct = (Number(w.hours) / maxH) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className="w-full rounded-t-sm bg-[#34a853] transition-all duration-500 min-h-[2px]"
                      style={{ height: `${Math.max(pct, 3)}%` }}
                    />
                     <span className="text-[9px] text-[#80868b] hidden group-hover:block absolute -bottom-4">
                      {Number(w.hours).toFixed(1)}h
                    </span>
                  </div>
                );
              });
            })()}
          </div>
          <div className="flex justify-between text-[10px] text-[#80868b] mt-5">
            <span>8 weeks ago</span>
            <span>This week</span>
          </div>
        </div>
      )}

      {/* Recent contributions */}
      {data.recentContributions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[#202124] mb-3">Recent Activity</h3>
          <div className="border border-[#dadce0] rounded-md overflow-hidden">
            {data.recentContributions.slice(0, 6).map((c, i) => (
              <ContributionCard key={c.id} contribution={c} index={i} showUser />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
