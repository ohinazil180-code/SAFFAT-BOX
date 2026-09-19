import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserStats, AuthResponse } from '../types';
import { readJsonResponse } from '../utils/http';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  userStats: UserStats | null;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'signup';
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, username: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (profile: { username: string; name: string; avatarColor: string }) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  openAuthModal: (tab?: 'login' | 'signup') => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'dropcode_auth_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('login');

  const fetchCurrentUser = useCallback(async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        const data = await readJsonResponse<{ user: User; stats?: UserStats; success: boolean; token: string; error?: string }>(res);
        setUser(data.user);
        setUserStats(data.stats || null);
      } else {
        // Token invalid or expired
        setUser(null);
        setUserStats(null);
        setToken(null);
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch (err) {
      console.warn('Could not verify current user session', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      setLoading(false);
    }
  }, [token, fetchCurrentUser]);

  const login = async (identifier: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await readJsonResponse<{ user: User; stats?: UserStats; success: boolean; token: string; error?: string }>(res);
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to sign in' };
      }

      const authToken = data.token;
      setToken(authToken);
      setUser(data.user);
      try {
        localStorage.setItem(TOKEN_KEY, authToken);
      } catch {
        // ignore
      }

      // Fetch fresh stats
      fetchCurrentUser(authToken);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during sign in' };
    }
  };

  const signup = async (email: string, username: string, password: string, name?: string) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password, name }),
      });

      const data = await readJsonResponse<{ user: User; stats?: UserStats; success: boolean; token: string; error?: string }>(res);
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to create account' };
      }

      const authToken = data.token;
      setToken(authToken);
      setUser(data.user);
      try {
        localStorage.setItem(TOKEN_KEY, authToken);
      } catch {
        // ignore
      }

      fetchCurrentUser(authToken);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during registration' };
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore
      }
    }
    setUser(null);
    setUserStats(null);
    setToken(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
  };

  const refreshUser = async () => {
    if (token) {
      await fetchCurrentUser(token);
    }
  };

  const updateProfile = async (profile: { username: string; name: string; avatarColor: string }) => {
    if (!token) return { success: false, error: 'Please sign in first' };
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(profile),
      });
      const data = await readJsonResponse<{ user: User; stats?: UserStats; success: boolean; token: string; error?: string }>(res);
      if (!res.ok || !data.success) return { success: false, error: data.error || 'Could not update profile' };
      setUser(data.user);
      return { success: true };
    } catch {
      return { success: false, error: 'Network error while saving profile' };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!token) return { success: false, error: 'Please sign in first' };
    const res = await fetch('/api/auth/password', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ currentPassword, newPassword }) });
    const data = await readJsonResponse<{ user: User; stats?: UserStats; success: boolean; token: string; error?: string }>(res);
    if (!res.ok) return { success: false, error: data.error || 'Could not change password' };
    return { success: true };
  };

  const deleteAccount = async () => {
    if (!token) return { success: false, error: 'Please sign in first' };
    const res = await fetch('/api/auth/account', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    const data = await readJsonResponse<{ user: User; stats?: UserStats; success: boolean; token: string; error?: string }>(res);
    if (!res.ok) return { success: false, error: data.error || 'Could not delete account' };
    setUser(null); setUserStats(null); setToken(null); localStorage.removeItem(TOKEN_KEY);
    return { success: true };
  };

  const openAuthModal = (tab: 'login' | 'signup' = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        userStats,
        isAuthModalOpen,
        authModalTab,
        login,
        signup,
        logout,
        refreshUser,
        updateProfile,
        changePassword,
        deleteAccount,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
