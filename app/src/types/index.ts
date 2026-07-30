// ── Role enum ──
export type Role = 'ADMIN' | 'COORDINATOR' | 'MEMBER';

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
 */
export interface EnrichedClub extends Club {
  description: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  contributionCount: number;
  coordinators: Pick<User, 'id' | 'name' | 'email'>[];
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
  invitedBy?: Pick<User, 'id' | 'email' | 'name' | 'role'> | null;
  invitees?: Pick<User, 'id' | 'email' | 'name' | 'role'>[];
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
  createdBy?: Pick<User, 'id' | 'name' | 'email'> | null;
  createdAt: string;
}

// ── Auth responses ──
export interface AuthResponse {
  user: Pick<User, 'id' | 'email' | 'name' | 'role'>;
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

// ── Member stats / profile ──
export interface MemberStats {
  totalContributions: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  approvedHours: number;
  recentContributions: Contribution[];
}

export interface MemberProfile extends User {
  stats: MemberStats;
}

// ── Contribution heatmap ──
export interface HeatmapDay {
  date: string;
  count: number;
  hours: number;
}

export interface HeatmapResponse {
  days: HeatmapDay[];
  totalContributions: number;
  totalHours: number;
  maxHours: number;
  startDate: string;
  endDate: string;
}

// ── Contribution model ──
export type ContributionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type ContributionCategory =
  | 'DEVELOPMENT'
  | 'WORKSHOP'
  | 'PRESENTATION'
  | 'DESIGN'
  | 'EVENT_SUPPORT'
  | 'DOCUMENTATION'
  | 'MEETING'
  | 'OTHER';

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
  user?: Pick<User, 'id' | 'name' | 'email'> | null;
  club?: Club | null;
  approvedBy?: Pick<User, 'id' | 'name' | 'email'> | null;
}

export interface ContributionListResponse {
  contributions: Contribution[];
  pagination: Pagination;
}

// ── Analytics ──
// Field names mirror the backend contract exactly (see frontend/types).
export interface CategoryStat {
  category: ContributionCategory;
  totalHours: number;
  count: number;
}

export interface TopContributor {
  user: Pick<User, 'id' | 'name' | 'email'> & { club?: Club | null };
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

// ── Leaderboard ──
export type LeaderboardPeriod = 'weekly' | 'monthly' | 'semester' | 'all';

export interface LeaderboardEntry {
  rank: number;
  user: Pick<User, 'id' | 'name' | 'email' | 'clubId' | 'club'>;
  totalHours: number;
  totalContributions: number;
}

export interface LeaderboardResponse {
  period: LeaderboardPeriod;
  entries: LeaderboardEntry[];
  pagination: Pagination;
}

// ── Generic API envelope ──
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}
