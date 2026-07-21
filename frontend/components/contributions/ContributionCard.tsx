"use client";

import type { Contribution, ContributionStatus, ContributionCategory } from "@/types";
import Link from "next/link";

interface ContributionCardProps {
  contribution: Contribution;
  index?: number;
  showUser?: boolean;
  showClub?: boolean;
}

// ── Visual helpers ────────────────────────────────────────────────────────────

export function getStatusConfig(status: ContributionStatus) {
  switch (status) {
    case "APPROVED":
      return {
        label: "Approved",
        dot: "bg-emerald-400",
        badge: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
      };
    case "REJECTED":
      return {
        label: "Rejected",
        dot: "bg-red-400",
        badge: "text-red-400 bg-red-500/10 border border-red-500/20",
      };
    default:
      return {
        label: "Pending",
        dot: "bg-amber-400",
        badge: "text-amber-400 bg-amber-500/10 border border-amber-500/20",
      };
  }
}

const CATEGORY_LABELS: Record<ContributionCategory, string> = {
  DEVELOPMENT: "Development",
  WORKSHOP: "Workshop",
  PRESENTATION: "Presentation",
  DESIGN: "Design",
  EVENT_SUPPORT: "Event Support",
  DOCUMENTATION: "Documentation",
  MEETING: "Meeting",
  OTHER: "Other",
};

const CATEGORY_COLORS: Record<ContributionCategory, string> = {
  DEVELOPMENT: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  WORKSHOP: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  PRESENTATION: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  DESIGN: "text-pink-400 bg-pink-500/10 border-pink-500/20",
  EVENT_SUPPORT: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  DOCUMENTATION: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  MEETING: "text-teal-400 bg-teal-500/10 border-teal-500/20",
  OTHER: "text-gray-400 bg-gray-500/10 border-gray-500/20",
};

export function getCategoryLabel(cat: ContributionCategory): string {
  return CATEGORY_LABELS[cat] ?? cat;
}

export function getCategoryColor(cat: ContributionCategory): string {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.OTHER;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ContributionCard({
  contribution,
  index = 0,
  showUser = false,
  showClub = false,
}: ContributionCardProps) {
  const status = getStatusConfig(contribution.status);
  const catColor = getCategoryColor(contribution.category);

  return (
    <Link
      href={`/contributions/${contribution.id}`}
      className="block group bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-5
                 hover:bg-glass-hover hover:border-glass-border-light
                 transition-all duration-300 ease-out
                 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-500/5
                 animate-fade-in"
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
    >
      {/* Top row */}
      <div className="flex items-start gap-3 mb-3">
        {/* Hours bubble */}
        <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20
                        border border-violet-500/20 flex flex-col items-center justify-center">
          <span className="text-[15px] font-bold text-violet-300 leading-none">
            {contribution.hours % 1 === 0
              ? contribution.hours
              : contribution.hours.toFixed(1)}
          </span>
          <span className="text-[9px] text-violet-400/60 mt-0.5 uppercase tracking-wider">hrs</span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-gray-100 leading-snug group-hover:text-white transition-colors line-clamp-2">
            {contribution.title}
          </h3>
          {showUser && contribution.user?.name && (
            <p className="text-xs text-gray-500 mt-0.5">{contribution.user.name}</p>
          )}
          {showClub && (
            <p className="text-xs text-violet-400/70 mt-0.5">{contribution.club?.name}</p>
          )}
        </div>

        {/* Status badge */}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${status.badge}`}>
          <span className={`w-1 h-1 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </div>

      {/* Description preview */}
      {contribution.description && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
          {contribution.description}
        </p>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.05]">
        {/* Category */}
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${catColor}`}>
          {getCategoryLabel(contribution.category)}
        </span>

        {/* Date */}
        <span className="text-[11px] text-gray-600">
          {new Date(contribution.datePerformed).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>

      {/* Rejection reason */}
      {contribution.status === "REJECTED" && contribution.rejectionReason && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/10">
          <p className="text-[11px] text-red-400/80">
            <span className="font-semibold">Reason: </span>
            {contribution.rejectionReason}
          </p>
        </div>
      )}
    </Link>
  );
}
