'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { StudentProfile, UserRole } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { fetchStudents, saveStudent } from '@/lib/db';

interface RegisterData {
  fullName: string;
  registerNumber: string;
  department: string;
  year: number;
  password?: string;
}

interface AuthContextType {
  user: StudentProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  registerStudent: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  loginStudent: (registerNumber: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginAdmin: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isLoading: true,
  registerStudent: async () => ({ success: false }),
  loginStudent: async () => ({ success: false }),
  loginAdmin: async () => ({ success: false }),
  logout: () => {},
});

const AUTH_STORAGE_KEY = 'jit_codearena_auth_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        setUser(JSON.parse(saved));
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const registerStudent = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    const regNo = data.registerNumber.trim().toUpperCase();

    // Check if student already exists in database
    const allStudents = await fetchStudents();
    const exists = allStudents.find((s) => s.register_number.toUpperCase() === regNo);
    if (exists) {
      return { success: false, error: `Student with Register Number ${regNo} is already registered.` };
    }

    const email = `${regNo.toLowerCase()}@student.jit.edu`;
    const newStudent: StudentProfile = {
      id: `std-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      email,
      full_name: data.fullName,
      role: 'student',
      register_number: regNo,
      department: data.department,
      year: data.year,
      section: 'A',
      status: 'active',
      created_at: new Date().toISOString(),
    };

    // If Supabase Auth is live, register user with auth
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('mock-') && !supabaseUrl.includes('your-project')) {
      try {
        const supabase = createClient();
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password: data.password || 'Student@12345',
          options: {
            data: {
              full_name: data.fullName,
              register_number: regNo,
              department: data.department,
              year: data.year,
              role: 'student',
            },
          },
        });
        if (authError) {
          return { success: false, error: authError.message };
        }
        if (authData.user) {
          newStudent.id = authData.user.id;
        }
      } catch (e: any) {
        console.warn('Supabase Auth signup error:', e);
      }
    }

    // Save profile to database
    await saveStudent(newStudent);

    setUser(newStudent);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newStudent));
    return { success: true };
  };

  const loginStudent = async (
    registerNumber: string,
    password?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const regNo = registerNumber.trim().toUpperCase();
    if (!regNo) {
      return { success: false, error: 'Please enter your Register Number.' };
    }

    // Query database for student
    const allStudents = await fetchStudents();
    const student = allStudents.find((s) => s.register_number.toUpperCase() === regNo);

    if (!student) {
      return {
        success: false,
        error: `No registered student found with Register Number "${regNo}". Please create an account first.`,
      };
    }

    if (student.status === 'disabled' || student.status === 'suspended') {
      return {
        success: false,
        error: 'Your student account is currently suspended. Please contact the exam cell coordinator.',
      };
    }

    // If Supabase Auth is active, authenticate password
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (password && supabaseUrl && !supabaseUrl.includes('mock-') && !supabaseUrl.includes('your-project')) {
      try {
        const supabase = createClient();
        const { error: authErr } = await supabase.auth.signInWithPassword({
          email: student.email || `${regNo.toLowerCase()}@student.jit.edu`,
          password,
        });
        if (authErr) {
          return { success: false, error: authErr.message };
        }
      } catch (e: any) {
        console.warn('Supabase Auth login error:', e);
      }
    }

    setUser(student);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(student));
    return { success: true };
  };

  const loginAdmin = async (
    email: string,
    password?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: 'Please enter your institutional email.' };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('mock-') && !supabaseUrl.includes('your-project')) {
      try {
        const supabase = createClient();
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password || '',
        });
        if (authErr) {
          return { success: false, error: authErr.message };
        }
        // Verify role in profile
        if (authData.user) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

          if (!prof || prof.role !== 'admin') {
            return {
              success: false,
              error: 'Access Denied: This account does not possess institutional examination administrator privileges.',
            };
          }

          const adminUser: StudentProfile = {
            id: authData.user.id,
            email: authData.user.email || cleanEmail,
            full_name: prof.full_name || 'Examination Controller',
            role: 'admin',
            register_number: 'ADMIN',
            department: 'EXAM_CELL',
            year: 0,
            status: 'active',
          };
          setUser(adminUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(adminUser));
          return { success: true };
        }
      } catch (e: any) {
        return { success: false, error: e?.message || 'Admin authentication failed.' };
      }
    }

    // Default admin session handler when using environment credentials
    const adminUser: StudentProfile = {
      id: 'admin-controller',
      email: cleanEmail,
      full_name: 'Institutional Examination Controller',
      role: 'admin',
      register_number: 'ADMIN',
      department: 'EXAM_CELL',
      year: 0,
      status: 'active',
    };

    setUser(adminUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(adminUser));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('mock-')) {
      try {
        const supabase = createClient();
        supabase.auth.signOut().catch(() => {});
      } catch {
        // safe
      }
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
