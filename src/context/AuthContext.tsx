'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { StudentProfile, UserRole } from '@/types';
import { MOCK_STUDENTS, MOCK_ADMIN } from '@/lib/mockData';

interface AuthContextType {
  user: StudentProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  loginAsStudent: (regNo: string) => boolean;
  loginAsAdmin: () => void;
  loginCustom: (profile: StudentProfile) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isLoading: true,
  loginAsStudent: () => false,
  loginAsAdmin: () => {},
  loginCustom: () => {},
  logout: () => {},
});

const AUTH_STORAGE_KEY = 'jit_codearena_session_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for saved session
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        setUser(JSON.parse(saved));
      } else {
        // Default to Harish Kumar (3rd Year CSE) for smooth testing
        const defaultStudent = MOCK_STUDENTS[0];
        setUser(defaultStudent);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(defaultStudent));
      }
    } catch {
      // In case of SSR or local storage error
      setUser(MOCK_STUDENTS[0]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginAsStudent = (regNo: string): boolean => {
    const student = MOCK_STUDENTS.find(
      (s) => s.register_number.toLowerCase() === regNo.trim().toLowerCase()
    );
    if (student) {
      setUser(student);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(student));
      return true;
    }
    // If not found in mock list, allow custom student creation with that regNo
    const customStudent: StudentProfile = {
      id: `s-${regNo.toLowerCase()}`,
      email: `${regNo.toLowerCase()}@jit.edu.in`,
      full_name: `Student (${regNo.toUpperCase()})`,
      role: 'student',
      register_number: regNo.toUpperCase(),
      department: 'CSE',
      year: 3,
    };
    setUser(customStudent);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(customStudent));
    return true;
  };

  const loginAsAdmin = () => {
    setUser(MOCK_ADMIN);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(MOCK_ADMIN));
  };

  const loginCustom = (profile: StudentProfile) => {
    setUser(profile);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isLoading,
        loginAsStudent,
        loginAsAdmin,
        loginCustom,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
