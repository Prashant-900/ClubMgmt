"use client";

interface PaginationProps {
  /** 1-based current page. */
  page: number;
  totalPages: number;
  /** Total row count across all pages, from the API's `pagination.total`. */
  total: number;
  onPageChange: (page: number) => void;
  /** Disable both buttons while a page request is in flight. */
  busy?: boolean;
  /** Singular noun for the readout, e.g. "member" → "42 members total". */
  itemLabel?: string;
  className?: string;
}

/**
 * Previous/Next pager driven by the API's `pagination` object.
 * Renders nothing when everything fits on a single page.
 */
export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
  busy = false,
  itemLabel = "item",
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const atStart = page <= 1;
  const atEnd = page >= totalPages;

  return (
    <nav
      aria-label="Pagination"
      className={`flex flex-wrap items-center justify-center gap-3 pt-2 ${className}`}
    >
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={atStart || busy}
        className="gh-btn gh-btn-default gh-btn-sm min-h-[36px] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ← Previous
      </button>

      <span className="text-xs text-[#5f6368] tabular-nums" aria-live="polite">
        Page {page} of {totalPages} · {total} {total === 1 ? itemLabel : `${itemLabel}s`} total
      </span>

      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={atEnd || busy}
        className="gh-btn gh-btn-default gh-btn-sm min-h-[36px] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next →
      </button>
    </nav>
  );
}
