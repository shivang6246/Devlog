'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/client-api';

/**
 * Convenience cache of the current user for UI state (navbar etc.).
 * The source of truth is the httpOnly cookie, checked by the API and middleware.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch('/api/auth/me');
      setUser(data.user);
      return data.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (email, password) => {
      const data = await apiFetch('/api/auth/login', { method: 'POST', body: { email, password } });
      setUser(data.user);
      router.refresh();
      return data.user;
    },
    [router]
  );

  const register = useCallback(
    async (name, email, password) => {
      // No session yet — returns { requiresVerification, email, message }.
      return apiFetch('/api/auth/register', {
        method: 'POST',
        body: { name, email, password },
      });
    },
    []
  );

  /** Finishes sign-up (verify-email) or password reset; both return a session. */
  const completeWithOtp = useCallback(
    async (path, body) => {
      const data = await apiFetch(path, { method: 'POST', body });
      setUser(data.user);
      router.refresh();
      return data.user;
    },
    [router]
  );

  const verifyEmail = useCallback(
    (email, otp) => completeWithOtp('/api/auth/verify-email', { email, otp }),
    [completeWithOtp]
  );

  const resetPassword = useCallback(
    (email, otp, newPassword) =>
      completeWithOtp('/api/auth/reset-password', { email, otp, newPassword }),
    [completeWithOtp]
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Network failure: still clear the local UI state and leave the page.
    } finally {
      setUser(null);
      router.push('/');
      router.refresh();
    }
  }, [router]);

  const value = useMemo(
    () => ({ user, loading, setUser, refresh, login, register, verifyEmail, resetPassword, logout }),
    [user, loading, refresh, login, register, verifyEmail, resetPassword, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
