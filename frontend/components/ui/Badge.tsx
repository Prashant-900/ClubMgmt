// Badge.tsx — Google-style label / status badges
import React from "react";
import type { ContributionCategory, ContributionStatus, Role } from "@/types";

// ── Role badge (Google palette: admin=red, coordinator=blue, member=green) ────

const ROLE_BADGE: Record<Role, string> = {
  ADMIN:
    "text-brand-red-fg bg-[rgba(234,67,53,0.10)] border border-[rgba(234,67,53,0.30)]",
  COORDINATOR:
    "text-brand-blue-fg bg-[rgba(66,133,244,0.10)] border border-[rgba(66,133,244,0.30)]",
  MEMBER:
    "text-brand-green-fg bg-[rgba(52,168,83,0.10)] border border-[rgba(52,168,83,0.30)]",
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
      "text-brand-green-fg bg-[rgba(52,168,83,0.10)] border border-[rgba(52,168,83,0.30)]",
    dot: "bg-brand-green",
  },
  REJECTED: {
    label: "Rejected",
    className:
      "text-brand-red-fg bg-[rgba(234,67,53,0.10)] border border-[rgba(234,67,53,0.30)]",
    dot: "bg-brand-red",
  },
  PENDING: {
    label: "Pending",
    className:
      "text-brand-yellow-fg bg-[rgba(251,188,5,0.16)] border border-[rgba(251,188,5,0.40)]",
    dot: "bg-brand-yellow",
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

// ── Category badge (mapped onto the four Google hues) ─────────────────────────

const CATEGORY_CONFIG: Record<ContributionCategory, { label: string; className: string }> = {
  DEVELOPMENT:   { label: "Development",   className: "text-brand-blue-fg bg-[rgba(66,133,244,0.10)] border border-[rgba(66,133,244,0.28)]" },
  WORKSHOP:      { label: "Workshop",      className: "text-brand-green-fg bg-[rgba(52,168,83,0.10)] border border-[rgba(52,168,83,0.28)]" },
  PRESENTATION:  { label: "Presentation",  className: "text-brand-blue-fg bg-[rgba(66,133,244,0.10)] border border-[rgba(66,133,244,0.28)]" },
  DESIGN:        { label: "Design",        className: "text-brand-red-fg bg-[rgba(234,67,53,0.10)] border border-[rgba(234,67,53,0.28)]" },
  EVENT_SUPPORT: { label: "Event Support", className: "text-brand-yellow-fg bg-[rgba(251,188,5,0.16)] border border-[rgba(251,188,5,0.35)]" },
  DOCUMENTATION: { label: "Documentation", className: "text-brand-blue-fg bg-[rgba(66,133,244,0.10)] border border-[rgba(66,133,244,0.28)]" },
  MEETING:       { label: "Meeting",       className: "text-brand-green-fg bg-[rgba(52,168,83,0.10)] border border-[rgba(52,168,83,0.28)]" },
  OTHER:         { label: "Other",         className: "text-fg-muted bg-surface-2 border border-border" },
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
