// Badge.tsx — GitHub-style label / status badges
import React from "react";
import type { ContributionCategory, ContributionStatus, Role } from "@/types";

// ── Role badge ────────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<Role, string> = {
  ADMIN:
    "text-[#a371f7] bg-[rgba(163,113,247,0.15)] border border-[rgba(163,113,247,0.4)]",
  COORDINATOR:
    "text-[#79c0ff] bg-[rgba(121,192,255,0.15)] border border-[rgba(121,192,255,0.4)]",
  MEMBER:
    "text-[#3fb950] bg-[rgba(63,185,80,0.15)] border border-[rgba(63,185,80,0.4)]",
};

interface RoleBadgeProps {
  role: Role;
  className?: string;
}

export function RoleBadge({ role, className = "" }: RoleBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium tracking-wide uppercase ${ROLE_BADGE[role]} ${className}`}
    >
      {role}
    </span>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ContributionStatus,
  { label: string; className: string; dot: string }
> = {
  APPROVED: {
    label: "Approved",
    className:
      "text-[#3fb950] bg-[rgba(63,185,80,0.15)] border border-[rgba(63,185,80,0.4)]",
    dot: "bg-[#3fb950]",
  },
  REJECTED: {
    label: "Rejected",
    className:
      "text-[#f85149] bg-[rgba(248,81,73,0.15)] border border-[rgba(248,81,73,0.4)]",
    dot: "bg-[#f85149]",
  },
  PENDING: {
    label: "Pending",
    className:
      "text-[#d29922] bg-[rgba(210,153,34,0.15)] border border-[rgba(210,153,34,0.4)]",
    dot: "bg-[#d29922]",
  },
};

interface StatusBadgeProps {
  status: ContributionStatus;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.className} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export function getStatusConfig(status: ContributionStatus) {
  return STATUS_CONFIG[status];
}

// ── Category badge ────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<ContributionCategory, { label: string; className: string }> = {
  DEVELOPMENT:   { label: "Development",   className: "text-[#79c0ff] bg-[rgba(121,192,255,0.12)] border border-[rgba(121,192,255,0.3)]" },
  WORKSHOP:      { label: "Workshop",      className: "text-[#a371f7] bg-[rgba(163,113,247,0.12)] border border-[rgba(163,113,247,0.3)]" },
  PRESENTATION:  { label: "Presentation",  className: "text-[#79c0ff] bg-[rgba(79,140,255,0.12)] border border-[rgba(79,140,255,0.3)]" },
  DESIGN:        { label: "Design",        className: "text-[#ff7b72] bg-[rgba(255,123,114,0.12)] border border-[rgba(255,123,114,0.3)]" },
  EVENT_SUPPORT: { label: "Event Support", className: "text-[#d29922] bg-[rgba(210,153,34,0.12)] border border-[rgba(210,153,34,0.3)]" },
  DOCUMENTATION: { label: "Documentation", className: "text-[#58a6ff] bg-[rgba(88,166,255,0.12)] border border-[rgba(88,166,255,0.3)]" },
  MEETING:       { label: "Meeting",       className: "text-[#3fb950] bg-[rgba(63,185,80,0.12)] border border-[rgba(63,185,80,0.3)]" },
  OTHER:         { label: "Other",         className: "text-[#8b949e] bg-[rgba(139,148,158,0.12)] border border-[rgba(139,148,158,0.3)]" },
};

interface CategoryBadgeProps {
  category: ContributionCategory;
  className?: string;
}

export function CategoryBadge({ category, className = "" }: CategoryBadgeProps) {
  const cfg = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.OTHER;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${cfg.className} ${className}`}>
      {cfg.label}
    </span>
  );
}

export function getCategoryLabel(category: ContributionCategory): string {
  return CATEGORY_CONFIG[category]?.label ?? category;
}

export function getCategoryClass(category: ContributionCategory): string {
  return CATEGORY_CONFIG[category]?.className ?? CATEGORY_CONFIG.OTHER.className;
}
