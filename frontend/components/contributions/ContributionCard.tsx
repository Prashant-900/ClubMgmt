"use client";

// ContributionCard.tsx — GitHub issue-row style (used in list view)
import type { Contribution, ContributionStatus, ContributionCategory } from "@/types";
import Link from "next/link";
import { StatusBadge, CategoryBadge, getCategoryLabel, getCategoryClass } from "@/components/ui/Badge";

// ── Re-export helpers for backward compat ─────────────────────────────────────

export { getCategoryLabel, getCategoryClass as getCategoryColor };

export function getStatusConfig(status: ContributionStatus) {
  const map = {
    APPROVED: { label: "Approved", dot: "bg-[#3fb950]", badge: "text-[#3fb950] bg-[rgba(63,185,80,0.15)] border border-[rgba(63,185,80,0.4)]" },
    REJECTED: { label: "Rejected", dot: "bg-[#f85149]", badge: "text-[#f85149] bg-[rgba(248,81,73,0.15)] border border-[rgba(248,81,73,0.4)]" },
    PENDING:  { label: "Pending",  dot: "bg-[#d29922]", badge: "text-[#d29922] bg-[rgba(210,153,34,0.15)] border border-[rgba(210,153,34,0.4)]" },
  };
  return map[status];
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ContributionCardProps {
  contribution: Contribution;
  index?: number;
  showUser?: boolean;
  showClub?: boolean;
}

export function ContributionCard({
  contribution,
  index = 0,
  showUser = false,
  showClub = false,
}: ContributionCardProps) {
  return (
    <Link
      href={`/contributions/${contribution.id}`}
      className="flex items-start gap-3 px-4 py-3 hover:bg-[#161b22] transition-colors border-b border-[#21262d] last:border-b-0 group animate-fade-in"
      style={{ animationDelay: `${index * 30}ms`, animationFillMode: "both" }}
    >
      {/* Status dot */}
      <div className="shrink-0 mt-1">
        <StatusBadge status={contribution.status} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-sm font-medium text-[#e6edf3] group-hover:text-[#58a6ff] transition-colors leading-snug">
            {contribution.title}
          </span>
          <CategoryBadge category={contribution.category} />
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#8b949e]">
          {showUser && contribution.user?.name && (
            <span>{contribution.user.name}</span>
          )}
          {showClub && contribution.club?.name && (
            <span className="text-[#58a6ff]">{contribution.club.name}</span>
          )}
          <span>
            {new Date(contribution.datePerformed).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
          {contribution.status === "REJECTED" && contribution.rejectionReason && (
            <span className="text-[#f85149]">· {contribution.rejectionReason}</span>
          )}
        </div>
      </div>

      {/* Hours */}
      <div className="shrink-0 text-right">
        <span className="text-sm font-semibold text-[#e6edf3] tabular-nums">
          {contribution.hours % 1 === 0 ? contribution.hours : contribution.hours.toFixed(1)}
          <span className="text-xs font-normal text-[#8b949e] ml-0.5">h</span>
        </span>
      </div>
    </Link>
  );
}
