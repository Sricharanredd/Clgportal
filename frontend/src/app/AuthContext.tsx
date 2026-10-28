/**
 * AuthContext — session state for staff (and parent token when applicable).
 *
 * Security notes (client is NOT the authority — the server re-checks every
 * request): permissions here only drive navigation/UX. The access token is
 * kept in memory; the refresh cookie is HttpOnly on the server side.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  get,
  post,
  refreshAccessToken,
  setAccessToken,
  SESSION_EXPIRED_EVENT,
} from '@/shared/api/client';
import type { LoginResponse, MeResponse, UserOut } from '@/shared/api/types';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  user: UserOut | null;
  login: (email: string, password: string) => Promise<UserOut>;
  logout: () => Promise<void>;
  has: (permission: string) => boolean;
  hasAny: (...permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<UserOut | null>(null);

  const clear = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('anonymous');
  }, []);

  // Bootstrap / re-validate: try the refresh cookie → /auth/me; else anonymous.
  const restoreSession = useCallback(async () => {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      setStatus('anonymous');
      return;
    }
    try {
      const me = await get<MeResponse>('/auth/me');
      setUser(me.user);
      setStatus('authenticated');
    } catch {
      clear();
    }
  }, [clear]);

  // Initial mount only. `restoreSession` is stable (clear is stable).
  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  // Back/forward cache: a page restored from bfcache still holds the OLD
  // in-memory token + React state. Drop the token and re-check the server so
  // a page visited before logout cannot be reused without reauthentication.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return; // normal load — handled by the effect above
      setAccessToken(null);
      setUser(null);
      setStatus('loading');
      void restoreSession();
    };
    window.addEventListener('pageshow', onPageShow as EventListener);
    return () => window.removeEventListener('pageshow', onPageShow as EventListener);
  }, [restoreSession]);

  // Server told us the session is gone (refresh failed mid-flight).
  useEffect(() => {
    const onExpired = () => clear();
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [clear]);

  const login = useCallback(async (email: string, password: string): Promise<UserOut> => {
    const res = await post<LoginResponse>('/auth/login', { email, password });
    setAccessToken(res.access_token);
    setUser(res.user);
    setStatus('authenticated');
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await post<void>('/auth/logout');
    } catch {
      // Even if the server call fails, drop the local session.
    }
    clear();
  }, [clear]);

  const value = useMemo<AuthContextValue>(() => {
    const permissions = new Set(user?.permissions ?? []);
    const roles = new Set(user?.roles ?? []);
    return {
      status,
      user,
      login,
      logout,
      has: (permission) => permissions.has(permission),
      hasAny: (...list) => list.some((p) => permissions.has(p)),
      hasRole: (role) => roles.has(role),
    };
  }, [status, user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
