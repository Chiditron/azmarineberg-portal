import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

const INACTIVITY_MS = 10 * 60 * 1000; // 10 minutes
const THROTTLE_MS = 1500; // reset at most once per 1.5s to avoid clearing on every mousemove

interface User {
  id: string;
  email: string;
  role: string;
  companyId: string | null;
  mustChangePassword?: boolean;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef(0);
  const logoutRef = useRef<() => void>(() => {});

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.getCurrentUser();
      setUser(data.user);
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    const data = await api.login(email, password);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    return data.user;
  };

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  }, []);
  logoutRef.current = logout;

  // Auto sign-out after 10 minutes of inactivity when user is logged in
  useEffect(() => {
    if (!user) return;

    const scheduleLogout = () => {
      if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = setTimeout(() => {
        toast('You were signed out due to inactivity.');
        logoutRef.current();
      }, INACTIVITY_MS);
    };

    const throttledReset = () => {
      const now = Date.now();
      if (now - lastActivityRef.current < THROTTLE_MS) return;
      lastActivityRef.current = now;
      scheduleLogout();
    };

    scheduleLogout(); // initial timer

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'mousedown'] as const;
    events.forEach((e) => window.addEventListener(e, throttledReset));

    return () => {
      events.forEach((e) => window.removeEventListener(e, throttledReset));
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
