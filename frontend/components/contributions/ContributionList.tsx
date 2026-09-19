"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { listContributions, listMyContributions } from "@/lib/api/contribution.api";
import { ContributionCard } from "./ContributionCard";
import type { Contribution, ContributionCategory } from "@/types";

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

  const [categoryFilter, setCategoryFilter] = useState<ContributionCategory | "">("");

  const limit = 20;

  const fetchContributions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
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
  }, [token, mineOnly, clubId, categoryFilter, page]);

  useEffect(() => { fetchContributions(); }, [fetchContributions]);
  useEffect(() => { setPage(1); }, [categoryFilter]);

  return (
    <div className="space-y-4">
      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-2">
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
        <span className="ml-auto text-xs text-[#5f6368]">
          {total} contribution{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-md bg-[rgba(234,67,53,0.1)] border border-[rgba(234,67,53,0.3)] text-sm text-[#c5221f]">
          {error}
        </div>
      )}

      {/* Issue list container */}
      <div className="bg-[#ffffff] border border-[#dadce0] rounded-md overflow-hidden">
        {/* List header */}
        <div className="flex items-center gap-3 px-4 py-2 bg-[#f8f9fa] border-b border-[#dadce0] text-xs text-[#5f6368]">
          <span className="font-medium">
            {loading ? "Loading…" : `${total} contribution${total !== 1 ? "s" : ""}`}
          </span>
          <span className="ml-auto text-xs">Hours</span>
        </div>

        {/* Rows */}
        {loading ? (
          <div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-[#f1f3f4] last:border-b-0">
                <div className="w-16 h-5 skeleton rounded-full" />
                <div className="flex-1 h-4 skeleton rounded" />
                <div className="w-8 h-4 skeleton rounded" />
              </div>
            ))}
          </div>
        ) : contributions.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-[#5f6368]">{emptyMessage}</p>
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
          <span className="text-xs text-[#5f6368]">Page {page} of {totalPages}</span>
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
