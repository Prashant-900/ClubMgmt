"use client";

// ContributionCard.tsx — GitHub issue-row style (used in list view)
import type { Contribution, ContributionCategory } from "@/types";
import Link from "next/link";
import { CategoryBadge, getCategoryLabel, getCategoryClass } from "@/components/ui/Badge";

// ── Re-export helpers for backward compat ─────────────────────────────────────

export { getCategoryLabel, getCategoryClass as getCategoryColor };

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
      className="flex items-start gap-3 px-4 py-3 hover:bg-[#f8f9fa] transition-colors border-b border-[#f1f3f4] last:border-b-0 group animate-fade-in"
      style={{ animationDelay: `${index * 30}ms`, animationFillMode: "both" }}
    >
      {/* Category indicator */}
      <div className="shrink-0 mt-1">
        <CategoryBadge category={contribution.category} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-sm font-medium text-[#202124] group-hover:text-[#1a73e8] transition-colors leading-snug">
            {contribution.title}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#5f6368]">
          {showUser && contribution.user?.name && (
            <span>{contribution.user.name}</span>
          )}
          {showClub && contribution.club?.name && (
            <span className="text-[#1a73e8]">{contribution.club.name}</span>
          )}
          <span>
            {new Date(contribution.datePerformed).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Hours */}
      <div className="shrink-0 text-right">
        <span className="text-sm font-semibold text-[#202124] tabular-nums">
          {contribution.hours % 1 === 0 ? contribution.hours : contribution.hours.toFixed(1)}
          <span className="text-xs font-normal text-[#5f6368] ml-0.5">h</span>
        </span>
      </div>
    </Link>
  );
}
