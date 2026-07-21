"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { listContributions, listMyContributions } from "@/lib/api/contribution.api";
import { ContributionCard } from "./ContributionCard";
import type { Contribution, ContributionStatus, ContributionCategory } from "@/types";

const STATUSES: { value: string; label: string }[] = [
  { value: "", label: "All Status" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

const CATEGORIES: { value: string; label: string }[] = [
  { value: "", label: "All Categories" },
  { value: "DEVELOPMENT", label: "Development" },
  { value: "WORKSHOP", label: "Workshop" },
  { value: "PRESENTATION", label: "Presentation" },
  { value: "DESIGN", label: "Design" },
  { value: "EVENT_SUPPORT", label: "Event Support" },
  { value: "DOCUMENTATION", label: "Documentation" },
  { value: "MEETING", label: "Meeting" },
  { value: "OTHER", label: "Other" },
];

interface ContributionListProps {
  /** If true, only shows the current user's contributions */
  mineOnly?: boolean;
  /** Scoped to a specific club (ADMIN can filter by club) */
  clubId?: string;
  showUser?: boolean;
  showClub?: boolean;
  emptyMessage?: string;
}

function SkeletonCard() {
  return (
    <div className="bg-glass border border-glass-border rounded-2xl p-5 space-y-3">
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-xl skeleton shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded skeleton" />
          <div className="h-3 w-1/2 rounded skeleton" />
        </div>
      </div>
      <div className="h-3 w-full rounded skeleton" />
      <div className="flex justify-between pt-2 border-t border-white/5">
        <div className="h-5 w-24 rounded-md skeleton" />
        <div className="h-3 w-20 rounded skeleton" />
      </div>
    </div>
  );
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

  const limit = 12;

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

  useEffect(() => {
    fetchContributions();
  }, [fetchContributions]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, categoryFilter]);

  const filterBtnClass = (active: boolean) =>
    `px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer ${
      active
        ? "bg-violet-600 text-white shadow-sm shadow-violet-600/30"
        : "text-gray-500 bg-white/[0.03] border border-white/[0.06] hover:text-gray-300 hover:bg-white/[0.06]"
    }`;

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Status filter */}
        <div className="flex gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value as ContributionStatus | "")}
              className={filterBtnClass(statusFilter === s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Separator */}
        <div className="w-px bg-white/10 mx-1 self-stretch" />

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as ContributionCategory | "")}
          className="px-3 py-1 rounded-full text-xs font-medium bg-white/[0.03] border border-white/[0.06]
                     text-gray-400 cursor-pointer focus:outline-none focus:border-violet-500/40
                     transition-all duration-150 hover:bg-white/[0.06]"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value} className="bg-[#0f0d1a] text-gray-100">
              {c.label}
            </option>
          ))}
        </select>

        {/* Count */}
        <span className="ml-auto text-xs text-gray-600 self-center">
          {total} contribution{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : contributions.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.03] border border-white/[0.06]
                       text-gray-400 hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed
                       transition-all cursor-pointer"
          >
            ← Prev
          </button>
          <span className="text-xs text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.03] border border-white/[0.06]
                       text-gray-400 hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed
                       transition-all cursor-pointer"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
