// ── Role enum ──
export type Role = "ADMIN" | "COORDINATOR" | "MEMBER";

// ── Club model ──
export interface Club {
  id: string;
  name: string;
}

// ── User model ──
export interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: Role;
  isVerified: boolean;
  clubId?: string | null;
  club?: Club | null;
  createdAt: string;
  invitedBy?: Pick<User, "id" | "email" | "name" | "role"> | null;
  invitees?: Pick<User, "id" | "email" | "name" | "role">[];
}

// ── Invite Link ──
export interface InviteLink {
  id: string;
  token: string;
  role: Role;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  club?: Club | null;
  createdBy?: Pick<User, "id" | "name" | "email"> | null;
  createdAt: string;
}

// ── Auth responses ──
export interface AuthResponse {
  user: Pick<User, "id" | "email" | "name" | "role">;
  token: string;
}

// ── Pagination ──
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  members: T[];
  pagination: Pagination;
}

// ── Generic API response wrapper ──
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

// ── Contribution enums ────────────────────────────────────────────────────────

export type ContributionStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ContributionCategory =
  | "DEVELOPMENT"
  | "WORKSHOP"
  | "PRESENTATION"
  | "DESIGN"
  | "EVENT_SUPPORT"
  | "DOCUMENTATION"
  | "MEETING"
  | "OTHER";

// ── Contribution model ────────────────────────────────────────────────────────

export interface Contribution {
  id: string;
  title: string;
  description: string | null;
  category: ContributionCategory;
  hours: number;
  datePerformed: string;
  attachmentUrl: string | null;
  status: ContributionStatus;
  rejectionReason: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: Pick<User, "id" | "name" | "email" | "role">;
  club: Pick<Club, "id" | "name">;
  approvedBy: Pick<User, "id" | "name" | "email"> | null;
}

// ── Contribution list response ────────────────────────────────────────────────

export interface ContributionListResponse {
  contributions: Contribution[];
  pagination: Pagination;
}

// ── Analytics types ───────────────────────────────────────────────────────────

export interface CategoryStat {
  category: ContributionCategory;
  totalHours: number;
  count: number;
}

export interface TopContributor {
  user: Pick<User, "id" | "name" | "email"> & { club?: Club | null };
  totalHours: number;
  totalContributions?: number;
}

export interface WeeklyTrendPoint {
  week: string;
  count: number;
  hours: number;
}

export interface ClubStats {
  totalApproved: number;
  totalPending: number;
  totalRejected: number;
  totalApprovedHours: number;
}

export interface ClubAnalytics {
  club: Club;
  stats: ClubStats;
  categoryBreakdown: CategoryStat[];
  topContributors: TopContributor[];
  recentContributions: Contribution[];
  weeklyTrend: WeeklyTrendPoint[];
}

export interface TopClub {
  club: Club;
  totalHours: number;
  count: number;
}

export interface GlobalAnalytics {
  stats: ClubStats;
  topClubs: TopClub[];
  topContributors: TopContributor[];
  categoryBreakdown: CategoryStat[];
  recentContributions: Contribution[];
  weeklyTrend: WeeklyTrendPoint[];
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export type LeaderboardPeriod = "weekly" | "monthly" | "semester" | "all";

export interface LeaderboardEntry {
  rank: number;
  user: Pick<User, "id" | "name" | "email"> & { club?: Club | null };
  totalHours: number;
  totalContributions: number;
}

export interface LeaderboardResponse {
  period: LeaderboardPeriod;
  entries: LeaderboardEntry[];
  pagination: Pagination;
}
