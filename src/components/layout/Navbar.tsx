'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Code2,
  Activity,
  Layers,
  FileSpreadsheet,
  Award,
  BarChart3,
  User,
  LogOut,
  ShieldCheck,
  GraduationCap,
  Users,
  BookOpen,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, role, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isExamScreen = pathname.startsWith('/student/test/') && !pathname.includes('/result') && !pathname.includes('/instructions');

  // Don't render full standard navbar inside full-screen coding test environment
  if (isExamScreen) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-600/25 group-hover:scale-105 transition-transform">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-white">JIT</span>
                  <span className="font-extrabold text-base tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">
                    CodeArena
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded font-mono">
                    v2.0
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 tracking-wider uppercase font-medium">
                  Institutional Online Coding Assessment Platform
                </p>
              </div>
            </Link>

            {/* Navigation links based on Role */}
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              {role === 'student' ? (
                <>
                  <Link
                    href="/student/dashboard"
                    className={`px-3 py-1.5 rounded-lg transition ${
                      pathname === '/student/dashboard'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/student/assessments"
                    className={`px-3 py-1.5 rounded-lg transition ${
                      pathname === '/student/assessments'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Assessments
                  </Link>
                  <Link
                    href="/student/analytics"
                    className={`px-3 py-1.5 rounded-lg transition ${
                      pathname === '/student/analytics'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    My Analytics
                  </Link>
                  <Link
                    href="/student/profile"
                    className={`px-3 py-1.5 rounded-lg transition ${
                      pathname === '/student/profile'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Profile
                  </Link>
                </>
              ) : role === 'admin' ? (
                <>
                  <Link
                    href="/admin/dashboard"
                    className={`px-3 py-1.5 rounded-lg transition ${
                      pathname === '/admin/dashboard'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Overview
                  </Link>
                  <Link
                    href="/admin/monitor"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                      pathname.startsWith('/admin/monitor')
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live Monitor</span>
                  </Link>
                  <Link
                    href="/admin/students"
                    className={`px-3 py-1.5 rounded-lg transition ${
                      pathname === '/admin/students'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Students
                  </Link>
                  <Link
                    href="/admin/questions"
                    className={`px-3 py-1.5 rounded-lg transition ${
                      pathname === '/admin/questions'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Questions
                  </Link>
                  <Link
                    href="/admin/tests"
                    className={`px-3 py-1.5 rounded-lg transition ${
                      pathname === '/admin/tests'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Tests
                  </Link>
                  <Link
                    href="/admin/analytics"
                    className={`px-3 py-1.5 rounded-lg transition ${
                      pathname === '/admin/analytics'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Analytics
                  </Link>
                  <Link
                    href="/admin/reports"
                    className={`px-3 py-1.5 rounded-lg transition ${
                      pathname === '/admin/reports'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Reports
                  </Link>
                  <Link
                    href="/admin/logs"
                    className={`px-3 py-1.5 rounded-lg transition ${
                      pathname === '/admin/logs'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Audit Logs
                  </Link>
                </>
              ) : null}
            </nav>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 pl-3">
                <Link
                  href={role === 'student' ? '/student/profile' : '/admin/dashboard'}
                  className="text-right hidden sm:block hover:opacity-80 transition"
                >
                  <div className="text-xs font-semibold text-white flex items-center justify-end gap-1.5">
                    <span>{user.full_name}</span>
                    {role === 'admin' ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Exam Cell
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                        {user.register_number}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {user.department} {user.year ? `• Year ${user.year}` : ''}
                  </p>
                </Link>

                <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shadow-sm">
                  {role === 'admin' ? <ShieldCheck className="w-5 h-5 text-indigo-400" /> : <GraduationCap className="w-5 h-5 text-blue-400" />}
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition shadow-md shadow-indigo-600/20"
                >
                  Student Login
                </Link>
                <Link
                  href="/register"
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
                >
                  Register
                </Link>
                <Link
                  href="/admin/login"
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-semibold rounded-lg border border-amber-500/30 transition"
                >
                  Admin Portal
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
