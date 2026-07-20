"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import type { Role } from "@/types";
import type { ReactNode } from "react";

interface RoleGateProps {
  /** Roles allowed to see the children */
  allowedRoles: Role[];
  children: ReactNode;
  /** Optional fallback if role doesn't match */
  fallback?: ReactNode;
}

/**
 * Conditionally renders children based on the current user's role.
 * Use this to gate any UI element by role.
 */
export function RoleGate({ allowedRoles, children, fallback = null }: RoleGateProps) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user || !allowedRoles.includes(user.role)) return <>{fallback}</>;

  return <>{children}</>;
}
