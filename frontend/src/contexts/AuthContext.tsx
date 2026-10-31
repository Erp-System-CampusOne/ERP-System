import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

import type { User, LoginUserInput } from '@/api/apiInterface';
import { loginUser as apiLoginUser, getCurrentUser as apiGetCurrentUser, logoutUser as apiLogoutUser, setApiConfig } from '@/api/apiCall';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginUserInput) => Promise<User | undefined | void>;
  logout: () => void;
  role: string | undefined;
  updateUser: (updatedUser: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'campusone_jwt_token';
const USER_KEY = 'campusone_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  // Synchronously restore user and token immediately from localStorage to prevent unexpected redirects on page refresh/direct navigation
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    try {
      const cached = localStorage.getItem(USER_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem(TOKEN_KEY);
    const cached = localStorage.getItem(USER_KEY);
    return Boolean(token && !cached);
  });

  const fetchCurrentUser = useCallback(async () => {
    try {
      const data = await apiGetCurrentUser();
      setUser(data);
      if (typeof window !== 'undefined') {
        localStorage.setItem(USER_KEY, JSON.stringify(data));
      }
    } catch (error: any) {
      console.warn('Failed to fetch current user', error);
      // Only invalidate session if the backend explicitly returned a 401 Unauthorized response
      const errMsg = String(error?.message || '');
      const is401 = errMsg.includes('401') || error?.status === 401 || error?.statusCode === 401;
      if (is401) {
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setApiConfig({ headers: { Authorization: '' } });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    setApiConfig({ headers: { Authorization: `Bearer ${token}` } });
    let isCancelled = false;

    apiGetCurrentUser()
      .then((data) => {
        if (!isCancelled && data) {
          setUser(data);
          if (typeof window !== 'undefined') {
            localStorage.setItem(USER_KEY, JSON.stringify(data));
          }
        }
      })
      .catch((error: any) => {
        if (isCancelled) return;
        console.warn('Failed to fetch current user', error);
        const errMsg = String(error?.message || '');
        const is401 = errMsg.includes('401') || error?.status === 401 || error?.statusCode === 401;
        if (is401) {
          setUser(null);
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setApiConfig({ headers: { Authorization: '' } });
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const login = async (input: LoginUserInput) => {
    setIsLoading(true);
    try {
      const res = await apiLoginUser(input);
      if (res && res.token) {
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        setApiConfig({ headers: { Authorization: `Bearer ${res.token}` } });
        setUser(res.user);
        return res.user;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiLogoutUser();
    } catch (e) {
      console.error('Logout failed', e);
    }
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setApiConfig({ headers: { Authorization: '' } });
  };

  const updateUser = useCallback((updated: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updated };
      if (typeof window !== 'undefined') {
        localStorage.setItem(USER_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const refreshUser = useCallback(async () => {
    await fetchCurrentUser();
  }, [fetchCurrentUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        role: user?.role,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
