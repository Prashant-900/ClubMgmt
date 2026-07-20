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
