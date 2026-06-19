'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  type AiadUserAbility,
  type AiadUserInfo,
  AUTH_SESSION_COOKIE,
  AUTH_TOKEN_COOKIE,
  getStoredAuthSessionId,
  getStoredAuthToken,
  logoutAiadSession,
} from '@/lib/auth-service';

interface AuthContextValue {
  user: AiadUserInfo | null;
  ability: AiadUserAbility | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function clearStoredAuthSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('__YK_LOGIN_TOKEN__');
  window.localStorage.removeItem('__YK_LOGIN_SESSION_ID__');
  window.localStorage.removeItem(AUTH_TOKEN_COOKIE);
  window.localStorage.removeItem(AUTH_SESSION_COOKIE);
  document.cookie = `${AUTH_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  document.cookie = `${AUTH_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AiadUserInfo | null>(null);
  const [ability, setAbility] = useState<AiadUserAbility | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    let timer: number | undefined;
    try {
      const controller = typeof AbortController === 'undefined' ? null : new AbortController();
      timer = window.setTimeout(() => controller?.abort(), 8000);
      const response = await fetch('/api/xiaoqiao/auth/me', {
        cache: 'no-store',
        signal: controller?.signal,
      });
      if (!response.ok) throw new Error('unauthorized');
      const payload = (await response.json()) as {
        user?: AiadUserInfo;
        ability?: AiadUserAbility | null;
      };
      if (!payload.user) throw new Error('unauthorized');
      setUser(payload.user);
      setAbility(payload.ability ?? null);
    } catch {
      clearStoredAuthSession();
      setUser(null);
      setAbility(null);
    } finally {
      if (timer) window.clearTimeout(timer);
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    if (typeof window !== 'undefined') {
      const token = getStoredAuthToken();
      const sessionId = getStoredAuthSessionId();
      if (token) {
        await logoutAiadSession(token, sessionId).catch(() => undefined);
      }
      clearStoredAuthSession();
      window.location.href = '/login';
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, ability, loading, refresh, logout }),
    [ability, loading, logout, refresh, user],
  );

  // Hard gate: never render the app shell without a valid login session.
  if (typeof window !== 'undefined' && !loading && !user) {
    if (window.location.pathname !== '/login') {
      const redirect = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
      window.location.replace(`/login?redirect=${redirect}`);
    }
    return null;
  }

  if (loading) {
    return null;
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}
