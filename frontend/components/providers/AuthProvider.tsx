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
import { getProfile } from "@/lib/api/auth.api";

const TOKEN_STORAGE_KEY = "clubmgmt.auth.token";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAdmin: boolean;
  isCoordinator: boolean;
  isMember: boolean;
  hasRole: (...roles: Role[]) => boolean;
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

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);

    if (!storedToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    setToken(storedToken);

    getProfile(storedToken)
      .then((response) => {
        setUser(response.data ?? null);
      })
      .catch(() => {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        setUser(null);
        setToken(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const hasRole = useCallback(
    (...roles: Role[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
    setToken(null);
  }, []);

  const value: AuthContextValue = {
    user,
    token,
    isAdmin: user?.role === "ADMIN",
    isCoordinator: user?.role === "COORDINATOR",
    isMember: user?.role === "MEMBER",
    hasRole,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
