"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { User, Role } from "@/types";
import { getProfile } from "@/lib/api/auth.api";
import { refreshSession, logout as logoutApi } from "@/lib/api/auth.api";
import { setAccessToken } from "@/lib/api/client";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAdmin: boolean;
  isCoordinator: boolean;
  isMember: boolean;
  hasRole: (...roles: Role[]) => boolean;
  /**
   * Seed the session after a successful login/register (or OAuth callback):
   * stores the access token in memory and loads the full profile. The refresh
   * cookie is already set by the backend at this point.
   */
  setSession: (token: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const defaultAuthContextValue: AuthContextValue = {
  user: null,
  token: null,
  isAdmin: false,
  isCoordinator: false,
  isMember: false,
  hasRole: () => false,
  setSession: async () => {},
  logout: () => {},
  loading: true,
};

const AuthContext = createContext<AuthContextValue>(defaultAuthContextValue);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // On boot, try to recover a session from the HttpOnly refresh cookie. If a
  // valid cookie exists the backend mints a fresh access token; otherwise this
  // 401s quietly and we land as a signed-out visitor. The access token is never
  // read from or written to localStorage.
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        const res = await refreshSession();
        const freshToken = res.data?.token ?? null;

        if (!freshToken) {
          throw new Error("No session");
        }

        if (cancelled) return;

        setAccessToken(freshToken);
        setToken(freshToken);

        // The refresh response carries a lightweight user; load the full
        // profile (club, phone, etc.) for the app shell.
        const profile = await getProfile(freshToken);
        if (cancelled) return;
        setUser(profile.data ?? null);
      } catch {
        if (cancelled) return;
        setAccessToken(null);
        setUser(null);
        setToken(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const setSession = useCallback(async (freshToken: string) => {
    setAccessToken(freshToken);
    setToken(freshToken);
    try {
      const profile = await getProfile(freshToken);
      setUser(profile.data ?? null);
    } catch {
      // Profile load failed but we still have a token; leave user null and let
      // the guards/refresh flow sort it out.
      setUser(null);
    }
  }, []);

  const hasRole = useCallback(
    (...roles: Role[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  const logout = useCallback(() => {
    // Best-effort server-side revoke; clear local state regardless of outcome.
    logoutApi().catch(() => {
      // Already-invalid session — nothing to recover.
    });
    setAccessToken(null);
    setUser(null);
    setToken(null);
    router.replace("/login");
  }, [router]);

  const value: AuthContextValue = {
    user,
    token,
    isAdmin: user?.role === "ADMIN",
    isCoordinator: user?.role === "COORDINATOR",
    isMember: user?.role === "MEMBER",
    hasRole,
    setSession,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
