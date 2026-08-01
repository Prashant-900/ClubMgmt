"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getLeaderboard } from "@/lib/api/contribution.api";
import { Avatar } from "@/components/ui/Avatar";
import type { LeaderboardEntry, LeaderboardPeriod } from "@/types";

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: "weekly",   label: "This week" },
  { value: "monthly",  label: "This month" },
  { value: "semester", label: "Semester" },
  { value: "all",      label: "All time" },
];

const MEDAL = ["🥇", "🥈", "🥉"];

interface LeaderboardProps {
  clubId?: string;
}

export function Leaderboard({ clubId }: LeaderboardProps) {
  const { token } = useAuth();
  const [period, setPeriod] = useState<LeaderboardPeriod>("all");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const res = await getLeaderboard({ period, clubId, limit: 20 }, token ?? undefined);
        if (res.data) setEntries(res.data.entries);
      } catch (err: unknown) {
        const e = err as { message?: string };
        setError(e?.message ?? "Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [period, clubId, token]);

  return (
    <div className="space-y-4">
      {/* Period tabs — GitHub segmented control */}
      <div className="flex items-center border border-[#dadce0] rounded-md overflow-hidden w-fit text-xs">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-3 py-1.5 font-medium transition-colors cursor-pointer border-r border-[#dadce0] last:border-r-0 whitespace-nowrap ${
              period === p.value
                ? "bg-[#f1f3f4] text-[#202124]"
                : "text-[#5f6368] hover:bg-[#f8f9fa] hover:text-[#202124]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-md bg-[rgba(234,67,53,0.1)] border border-[rgba(234,67,53,0.3)] text-sm text-[#c5221f]">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="border border-[#dadce0] rounded-md overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[40px_1fr_auto_auto_auto] gap-4 px-4 py-2 bg-[#f8f9fa] border-b border-[#dadce0] text-xs font-medium text-[#5f6368]">
          <span>#</span>
          <span>Member</span>
          <span className="text-right hidden sm:block">Club</span>
          <span className="text-right">Hours</span>
          <span className="text-right hidden sm:block">Contrib.</span>
        </div>

        {loading ? (
          <div>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-[#f1f3f4] last:border-b-0">
                <div className="w-6 h-4 skeleton rounded" />
                <div className="w-8 h-8 rounded-full skeleton shrink-0" />
                <div className="flex-1 h-4 skeleton rounded" />
                <div className="w-12 h-4 skeleton rounded ml-auto" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-[#5f6368]">No contributions in this period yet.</p>
          </div>
        ) : (
          <div>
            {entries.map((entry, i) => {
              const isTop3 = entry.rank <= 3;
              return (
                <div
                  key={entry.user?.id ?? i}
                  className={`grid grid-cols-[40px_1fr_auto_auto_auto] gap-4 items-center px-4 py-3
                    border-b border-[#f1f3f4] last:border-b-0
                    ${isTop3 ? "bg-[rgba(255,255,255,0.02)]" : "hover:bg-[#f8f9fa]"}
                    transition-colors animate-fade-in`}
                  style={{ animationDelay: `${i * 30}ms`, animationFillMode: "both" }}
                >
                  {/* Rank */}
                  <div className="text-sm font-mono text-[#5f6368]">
                    {isTop3 ? MEDAL[entry.rank - 1] : `${entry.rank}`}
                  </div>

                  {/* Member */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar
                      name={entry.user?.name}
                      email={entry.user?.email ?? ""}
                      role="MEMBER"
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#202124] truncate leading-tight">
                        {entry.user?.name ?? entry.user?.email ?? "Unknown"}
                      </p>
                      {entry.user?.club?.name && (
                        <p className="text-xs text-[#5f6368] truncate sm:hidden">{entry.user.club.name}</p>
                      )}
                    </div>
                  </div>

                  {/* Club (hidden on small screens — shown inline above) */}
                  <div className="text-right hidden sm:block">
                    {entry.user?.club?.name && (
                      <span className="text-xs text-[#5f6368] truncate">{entry.user.club.name}</span>
                    )}
                  </div>

                  {/* Hours */}
                  <div className="text-right">
                    <span className={`text-sm font-semibold tabular-nums ${isTop3 ? "text-[#188038]" : "text-[#202124]"}`}>
                      {entry.totalHours % 1 === 0 ? entry.totalHours : entry.totalHours.toFixed(1)}
                      <span className="text-xs font-normal text-[#5f6368] ml-0.5">h</span>
                    </span>
                  </div>

                  {/* Contributions */}
                  <div className="text-right hidden sm:block">
                    <span className="text-xs text-[#5f6368] tabular-nums">{entry.totalContributions}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
