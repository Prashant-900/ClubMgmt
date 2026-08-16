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
  loadPersistedToken,
  persistToken,
  clearPersistedToken,
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
    // Forget the persisted access token so a later boot can't restore it.
    void clearPersistedToken();
  }, []);

  const setSession = useCallback(async (freshToken: string) => {
    // Persist the access token (memory + AsyncStorage) so the session survives
    // app restarts — there is no refresh cookie to fall back on.
    await persistToken(freshToken);
    setToken(freshToken);
    try {
      const profile = await authApi.getProfile(freshToken);
      if (mounted.current) {
        setUser(profile.data ?? null);
      }
    } catch {
      // Token is set but the profile call failed; leave user null and let the
      // guards / unauthorized handler recover.
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

  // Bootstrap: restore the session from the access token persisted in
  // AsyncStorage. If one exists we re-fetch the profile to validate it; a 401
  // there means it expired and the client's unauthorized handler clears it.
  useEffect(() => {
    mounted.current = true;

    (async () => {
      try {
        const storedToken = await loadPersistedToken();
        if (!storedToken) {
          throw new Error('No session');
        }
        if (mounted.current) {
          setToken(storedToken);
        }
        const profile = await authApi.getProfile(storedToken);
        if (mounted.current) {
          setUser(profile.data ?? null);
        }
      } catch {
        setAccessToken(null);
        void clearPersistedToken();
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
