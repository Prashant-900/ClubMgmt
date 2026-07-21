"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getLeaderboard } from "@/lib/api/contribution.api";
import type { LeaderboardEntry, LeaderboardPeriod } from "@/types";

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: "weekly", label: "This Week" },
  { value: "monthly", label: "This Month" },
  { value: "semester", label: "Semester" },
  { value: "all", label: "All Time" },
];

function getMedalColor(rank: number) {
  if (rank === 1) return "text-amber-400 bg-amber-500/15 border-amber-500/20";
  if (rank === 2) return "text-gray-300 bg-gray-500/15 border-gray-500/20";
  if (rank === 3) return "text-orange-400 bg-orange-500/15 border-orange-500/20";
  return "text-gray-600 bg-white/[0.03] border-white/[0.06]";
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  }
  return email[0].toUpperCase();
}

interface LeaderboardProps {
  clubId?: string; // Admin can scope by club
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
        const res = await getLeaderboard(
          { period, clubId, limit: 20 },
          token ?? undefined
        );
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
    <div className="space-y-5">
      {/* Period tabs */}
      <div className="flex gap-1.5 p-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl w-fit">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer
              ${period === p.value
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/20"
                : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
              }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl skeleton" />
          ))}
        </div>
      ) : error ? (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No contributions in this period yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <div
              key={entry.user?.id ?? i}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 animate-fade-in
                ${entry.rank <= 3
                  ? "bg-gradient-to-r from-white/[0.04] to-white/[0.02] border-white/[0.08]"
                  : "bg-glass border-glass-border hover:bg-glass-hover"
                }`}
              style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}
            >
              {/* Rank badge */}
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${getMedalColor(entry.rank)}`}>
                {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : entry.rank}
              </div>

              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600/60 to-indigo-700/60 flex items-center justify-center text-white text-xs font-bold shrink-0 ring-2 ring-white/[0.08]">
                {entry.user ? getInitials(entry.user.name ?? null, entry.user.email) : "?"}
              </div>

              {/* Name + club */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-100 truncate leading-tight">
                  {entry.user?.name ?? entry.user?.email ?? "Unknown"}
                </p>
                {entry.user?.club?.name && (
                  <p className="text-[11px] text-violet-400/70 truncate">{entry.user.club.name}</p>
                )}
              </div>

              {/* Stats */}
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-violet-300">
                  {entry.totalHours % 1 === 0 ? entry.totalHours : entry.totalHours.toFixed(1)} hrs
                </p>
                <p className="text-[10px] text-gray-600">
                  {entry.totalContributions} contribution{entry.totalContributions !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
