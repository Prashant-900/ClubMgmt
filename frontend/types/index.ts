// ── Role enum ──
export type Role = "ADMIN" | "COORDINATOR" | "MEMBER";

// ── Club model ──
export interface Club {
  id: string;
  name: string;
  /** Optional blurb, up to 500 chars. Absent on the lightweight public list. */
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Club as returned by `GET /api/clubs?enriched=true`.
 *
 * The enriched variant exists so the club grid can render member counts and
 * coordinator names from a single request instead of one request per card.
 */
export interface EnrichedClub extends Club {
  description: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  contributionCount: number;
  coordinators: Pick<User, "id" | "name" | "email">[];
  /** Display name of the first coordinator, or null when the club has none. */
  coordinatorName: string | null;
  coordinatorCount: number;
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

/**
 * Contribution summary attached to a member profile by
 * `GET /api/members/:id`.
 */
export interface MemberStats {
  totalContributions: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  approvedHours: number;
  recentContributions: Pick<
    Contribution,
    "id" | "title" | "category" | "hours" | "status" | "datePerformed" | "createdAt"
  >[];
}

/** A single member's detail view, including their contribution record. */
export interface MemberProfile extends User {
  stats: MemberStats;
}

/**
 * One cell of the contribution heatmap, from
 * `GET /api/contributions/heatmap`.
 */
export interface HeatmapDay {
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
  count: number;
  hours: number;
}

export interface HeatmapResponse {
  days: HeatmapDay[];
  totalContributions: number;
  totalHours: number;
  /** Highest single-day hours in the window — use it to scale the colour ramp. */
  maxHours: number;
  startDate: string;
  endDate: string;
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

// ── Notifications ──
// Frontend-facing shape for the notification system (redesign initiative).
// The backend model/endpoints are delivered separately; the web bell polls
// these and degrades gracefully (empty) when the API isn't live yet.
export type NotificationType =
  | "CONTRIBUTION_APPROVED"
  | "CONTRIBUTION_REJECTED"
  | "CONTRIBUTION_PENDING"
  | "INVITE_USED";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  read: boolean;
  linkTo?: string | null;
  createdAt: string;
}
