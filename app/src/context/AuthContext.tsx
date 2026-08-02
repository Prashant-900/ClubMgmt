import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Linking } from 'react-native';
import type { Role, User } from '../types';
import {
  setAccessToken,
  setUnauthorizedHandler,
  loadPersistedRefreshCookie,
  clearPersistedRefreshCookie,
} from '../api/client';
import * as authApi from '../api/auth.api';
import {
  parseCallbackUrl,
  parseInviteUrl,
  signInWithGoogle,
  type GoogleAuthResult,
} from '../auth/googleAuth';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  /** True while a Google sign-in round trip is in flight. */
  signingIn: boolean;
  isAdmin: boolean;
  isCoordinator: boolean;
  isMember: boolean;
  hasRole: (...roles: Role[]) => boolean;
  /** Seed the session from an access token (login / register / OAuth). */
  setSession: (token: string) => Promise<void>;
  /** Kick off Google sign-in via Chrome Custom Tab. */
  loginWithGoogle: (inviteToken?: string) => Promise<GoogleAuthResult>;
  logout: () => void;
  /** Re-pull the profile (e.g. after an admin assigns a club). */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  // Guards against setState after unmount during async bootstrap.
  const mounted = useRef(true);
  // Mirrors `user` so the deep-link listener can read the latest auth state
  // without re-subscribing on every profile change.
  const userRef = useRef<User | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setToken(null);
    setUser(null);
    // Forget the persisted refresh cookie so a later boot can't restore it.
    void clearPersistedRefreshCookie();
  }, []);

  const setSession = useCallback(async (freshToken: string) => {
    // Access token lives in memory only — never AsyncStorage / Keychain.
    setAccessToken(freshToken);
    setToken(freshToken);
    try {
      const profile = await authApi.getProfile(freshToken);
      if (mounted.current) {
        setUser(profile.data ?? null);
      }
    } catch {
      // Token is set but the profile call failed; leave user null and let the
      // guards / silent-refresh flow recover.
      if (mounted.current) {
        setUser(null);
      }
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await authApi.getProfile();
      if (mounted.current) {
        setUser(profile.data ?? null);
      }
    } catch {
      // Ignore — a 401 here is handled by the client's unauthorized handler.
    }
  }, []);

  const logout = useCallback(() => {
    // Best-effort server-side revoke; clear local state regardless.
    authApi.logout().catch(() => {
      // Session already invalid — nothing to recover.
    });
    clearSession();
  }, [clearSession]);

  // Register the 401 handler so the API client can eject us when silent refresh
  // fails. This replaces the web app's window.location.replace('/login').
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
    });
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  // Bootstrap: try to recover a session from the HttpOnly refresh cookie held
  // in the native cookie jar. If none exists this 401s quietly.
  useEffect(() => {
    mounted.current = true;

    (async () => {
      try {
        // Restore the persisted refresh cookie first so the refresh call below
        // can authenticate even after a cold start / app reinstall.
        await loadPersistedRefreshCookie();
        const res = await authApi.refreshSession();
        const freshToken = res.data?.token ?? null;
        if (!freshToken) {
          throw new Error('No session');
        }
        setAccessToken(freshToken);
        if (mounted.current) {
          setToken(freshToken);
        }
        const profile = await authApi.getProfile(freshToken);
        if (mounted.current) {
          setUser(profile.data ?? null);
        }
      } catch {
        setAccessToken(null);
        if (mounted.current) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (mounted.current) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted.current = false;
    };
  }, []);

  const loginWithGoogle = useCallback(
    async (inviteToken?: string): Promise<GoogleAuthResult> => {
      setSigningIn(true);
      try {
        const result = await signInWithGoogle(inviteToken);
        if (result.type === 'success') {
          await setSession(result.token);
        }
        return result;
      } finally {
        if (mounted.current) {
          setSigningIn(false);
        }
      }
    },
    [setSession],
  );

  // Deep-link listener, handling two kinds of clubmgmt:// links:
  //   1. auth/callback?token=…  — the OAuth round trip returning via the system
  //      browser (used when no Chrome Custom Tab is available).
  //   2. invite/<token>         — a shared invite link opened while the app is
  //      installed. We kick off Google sign-in pre-loaded with the invite token.
  useEffect(() => {
    async function handleUrl(url: string | null) {
      if (!url) return;

      const callback = parseCallbackUrl(url);
      if (callback?.type === 'success') {
        setSigningIn(true);
        await setSession(callback.token);
        if (mounted.current) {
          setSigningIn(false);
        }
        return;
      }

      const inviteToken = parseInviteUrl(url);
      if (inviteToken) {
        // Only auto-start sign-in when signed out — an already-authenticated
        // device shouldn't be bounced into a new OAuth flow by an invite link.
        if (!mounted.current || userRef.current) return;
        await loginWithGoogle(inviteToken);
      }
    }

    const sub = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });
    // Cold start via deep link.
    Linking.getInitialURL().then(handleUrl);

    return () => sub.remove();
  }, [setSession, loginWithGoogle]);

  const hasRole = useCallback(
    (...roles: Role[]) => (user ? roles.includes(user.role) : false),
    [user],
  );

  const value: AuthContextValue = {
    user,
    token,
    loading,
    signingIn,
    isAdmin: user?.role === 'ADMIN',
    isCoordinator: user?.role === 'COORDINATOR',
    isMember: user?.role === 'MEMBER',
    hasRole,
    setSession,
    loginWithGoogle,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
