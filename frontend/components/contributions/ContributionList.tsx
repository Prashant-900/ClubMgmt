"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { listContributions, listMyContributions } from "@/lib/api/contribution.api";
import { ContributionCard } from "./ContributionCard";
import type { Contribution, ContributionStatus, ContributionCategory } from "@/types";

const STATUSES: { value: string; label: string }[] = [
  { value: "",         label: "All status" },
  { value: "PENDING",  label: "Open" },
  { value: "APPROVED", label: "Closed" },
  { value: "REJECTED", label: "Rejected" },
];

const CATEGORIES: { value: string; label: string }[] = [
  { value: "",              label: "All categories" },
  { value: "DEVELOPMENT",   label: "Development" },
  { value: "WORKSHOP",      label: "Workshop" },
  { value: "PRESENTATION",  label: "Presentation" },
  { value: "DESIGN",        label: "Design" },
  { value: "EVENT_SUPPORT", label: "Event Support" },
  { value: "DOCUMENTATION", label: "Documentation" },
  { value: "MEETING",       label: "Meeting" },
  { value: "OTHER",         label: "Other" },
];

interface ContributionListProps {
  mineOnly?: boolean;
  clubId?: string;
  showUser?: boolean;
  showClub?: boolean;
  emptyMessage?: string;
}

export function ContributionList({
  mineOnly = false,
  clubId,
  showUser = false,
  showClub = false,
  emptyMessage = "No contributions found.",
}: ContributionListProps) {
  const { token } = useAuth();

  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [statusFilter, setStatusFilter] = useState<ContributionStatus | "">("");
  const [categoryFilter, setCategoryFilter] = useState<ContributionCategory | "">("");

  const limit = 20;

  const fetchContributions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        clubId: clubId || undefined,
        page,
        limit,
      };

      const res = mineOnly
        ? await listMyContributions(params, token ?? undefined)
        : await listContributions(params, token ?? undefined);

      if (res.data) {
        setContributions(res.data.contributions);
        setTotal(res.data.pagination.total);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message ?? "Failed to load contributions");
    } finally {
      setLoading(false);
    }
  }, [token, mineOnly, clubId, statusFilter, categoryFilter, page]);

  useEffect(() => { fetchContributions(); }, [fetchContributions]);
  useEffect(() => { setPage(1); }, [statusFilter, categoryFilter]);

  return (
    <div className="space-y-4">
      {/* Filter toolbar — GitHub issue list style */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status filters */}
        <div className="flex items-center border border-[#30363d] rounded-md overflow-hidden text-xs">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value as ContributionStatus | "")}
              className={`px-3 py-1.5 font-medium transition-colors cursor-pointer border-r border-[#30363d] last:border-r-0 ${
                statusFilter === s.value
                  ? "bg-[#21262d] text-[#e6edf3]"
                  : "text-[#8b949e] hover:bg-[#161b22] hover:text-[#e6edf3]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as ContributionCategory | "")}
          className="gh-select text-xs"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        {/* Count */}
        <span className="ml-auto text-xs text-[#8b949e]">
          {total} contribution{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-md bg-[rgba(248,81,73,0.1)] border border-[rgba(248,81,73,0.3)] text-sm text-[#f85149]">
          {error}
        </div>
      )}

      {/* Issue list container */}
      <div className="bg-[#0d1117] border border-[#30363d] rounded-md overflow-hidden">
        {/* List header */}
        <div className="flex items-center gap-3 px-4 py-2 bg-[#161b22] border-b border-[#30363d] text-xs text-[#8b949e]">
          <span className="font-medium">
            {loading ? "Loading…" : `${total} contribution${total !== 1 ? "s" : ""}`}
          </span>
          <span className="ml-auto text-xs">Hours</span>
        </div>

        {/* Rows */}
        {loading ? (
          <div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-[#21262d] last:border-b-0">
                <div className="w-16 h-5 skeleton rounded-full" />
                <div className="flex-1 h-4 skeleton rounded" />
                <div className="w-8 h-4 skeleton rounded" />
              </div>
            ))}
          </div>
        ) : contributions.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-[#8b949e]">{emptyMessage}</p>
          </div>
        ) : (
          <div>
            {contributions.map((c, i) => (
              <ContributionCard
                key={c.id}
                contribution={c}
                index={i}
                showUser={showUser}
                showClub={showClub}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="gh-btn gh-btn-default gh-btn-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <span className="text-xs text-[#8b949e]">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="gh-btn gh-btn-default gh-btn-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
