"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { User, Role } from "@/types";

// ── Local dev admin — matches backend's auth.middleware.js bypass ──
const LOCAL_DEV_ADMIN: User = {
  id: "local-admin",
  email: "admin@localhost",
  name: "Local Admin",
  phone: null,
  role: "ADMIN" as Role,
  isVerified: true,
  createdAt: new Date().toISOString(),
};

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAdmin: boolean;
  isCoordinator: boolean;
  isMember: boolean;
  hasRole: (...roles: Role[]) => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isAdmin: false,
  isCoordinator: false,
  isMember: false,
  hasRole: () => false,
  loading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In dev, use the local admin (no token needed — backend bypasses auth)
    setUser(LOCAL_DEV_ADMIN);
    setToken(null); // No token = backend local-admin bypass
    setLoading(false);
  }, []);

  const hasRole = useCallback(
    (...roles: Role[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  const value: AuthContextValue = {
    user,
    token,
    isAdmin: user?.role === "ADMIN",
    isCoordinator: user?.role === "COORDINATOR",
    isMember: user?.role === "MEMBER",
    hasRole,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
