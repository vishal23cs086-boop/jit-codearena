'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { StudentProfile, UserRole } from '@/types';

interface RegisterData {
  fullName: string;
  registerNumber: string;
  department: string;
  year: number;
  password?: string;
  section?: string;
  phone?: string;
}

interface AuthContextType {
  user: StudentProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  registerStudent: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  loginStudent: (registerNumber: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginAdmin: (username: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  sendPresenceHeartbeat: (meta?: {
    active_assessment_id?: string;
    current_question_index?: number;
    total_questions?: number;
    violation_count?: number;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isLoading: true,
  registerStudent: async () => ({ success: false }),
  loginStudent: async () => ({ success: false }),
  loginAdmin: async () => ({ success: false }),
  logout: () => {},
  sendPresenceHeartbeat: async () => {},
});

const AUTH_STORAGE_KEY = 'jit_codearena_auth_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);

  const logout = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    setUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem('jit_ca_students_v2');
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setUser(parsed);

        // Immediate server verification: ensure student account is still active and valid in Turso
        if (parsed && parsed.role === 'student' && parsed.id) {
          fetch('/api/student/session-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              student_id: parsed.id,
              session_version: parsed.session_version,
            }),
          }).then(async (res) => {
            if (!res.ok) {
              logout();
              if (typeof window !== 'undefined' && window.location.pathname.startsWith('/student')) {
                window.location.href = '/login';
              }
            } else {
              const data = await res.json();
              if (data.session_version && data.session_version !== parsed.session_version) {
                const updated = { ...parsed, session_version: data.session_version };
                setUser(updated);
                localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
              }
            }
          }).catch(() => {});
        }
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  const sendPresenceHeartbeat = useCallback(
    async (meta?: {
      active_assessment_id?: string;
      current_question_index?: number;
      total_questions?: number;
      violation_count?: number;
    }) => {
      if (!user || user.role !== 'student') return;

      try {
        const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
        const res = await fetch('/api/presence/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: user.id,
            session_version: user.session_version,
            register_number: user.register_number,
            full_name: user.full_name,
            department: user.department,
            year: user.year,
            section: user.section || 'A',
            current_page: pathname,
            active_assessment_id: meta?.active_assessment_id || null,
            current_question_index: meta?.current_question_index || 0,
            total_questions: meta?.total_questions || 0,
            violation_count: meta?.violation_count || 0,
          }),
        });

        if (res.status === 401 || res.status === 403) {
          // Account was deleted, archived, disabled, or session invalidated
          logout();
          if (typeof window !== 'undefined' && window.location.pathname.startsWith('/student')) {
            window.location.href = '/login';
          }
        }
      } catch (err) {
        // Silent network failure
      }
    },
    [user, logout]
  );

  // Student heartbeat loop: fires every 25 seconds
  useEffect(() => {
    if (!user || user.role !== 'student') {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      return;
    }

    // Fire immediately upon authentication
    sendPresenceHeartbeat();

    heartbeatTimerRef.current = setInterval(() => {
      sendPresenceHeartbeat();
    }, 25000);

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [user, sendPresenceHeartbeat]);

  const registerStudent = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, error: json.error || 'Registration failed.' };
      }

      setUser(json.user);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(json.user));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error during registration.' };
    }
  };

  const loginStudent = async (
    registerNumber: string,
    password?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registerNumber, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, error: json.error || 'Invalid credentials.' };
      }

      setUser(json.user);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(json.user));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error during student login.' };
    }
  };

  const loginAdmin = async (
    username: string,
    password?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, error: json.error || 'Invalid Administrator credentials.' };
      }

      setUser(json.user);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(json.user));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error during administrator login.' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isLoading,
        registerStudent,
        loginStudent,
        loginAdmin,
        logout,
        sendPresenceHeartbeat,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
