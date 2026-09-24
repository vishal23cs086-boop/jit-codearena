'use client';

import React, { useState } from 'react';
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
  LayoutDashboard,
  ShieldAlert,
  Bell,
  CheckCircle2,
  Radio,
  Settings,
  HelpCircle,
  Menu,
  X,
  FileCode,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface NavbarProps {
  children?: React.ReactNode;
}

export const Navbar: React.FC<NavbarProps> = ({ children }) => {
  const { user, role, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const isExamScreen =
    pathname.startsWith('/student/test/') &&
    !pathname.includes('/result') &&
    !pathname.includes('/instructions');

  // If in fullscreen test interface, render children directly
  if (isExamScreen) {
    return <>{children}</>;
  }

  const isStudentPortal = pathname.startsWith('/student') && !pathname.includes('/student/test/');
  const isAdminPortal = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isPortalLayout = isStudentPortal || isAdminPortal;

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const getPageTitle = () => {
    if (pathname === '/student/dashboard') return { title: 'Dashboard', category: 'Student Portal' };
    if (pathname === '/student/assessments') return { title: 'Scheduled Assessments', category: 'Examinations' };
    if (pathname === '/student/analytics') return { title: 'Performance Intelligence', category: 'Analytics' };
    if (pathname === '/student/profile') return { title: 'Academic Profile', category: 'Student Record' };
    if (pathname.includes('/instructions')) return { title: 'Test Instructions', category: 'Examination' };
    if (pathname.includes('/result')) return { title: 'Official Scorecard', category: 'Assessment Result' };

    if (pathname === '/admin/dashboard') return { title: 'Control Center', category: 'Administration' };
    if (pathname.startsWith('/admin/monitor')) return { title: 'Live Examination Telemetry', category: 'Real-Time Invigilation' };
    if (pathname === '/admin/students') return { title: 'Candidate Directory', category: 'Student Records' };
    if (pathname === '/admin/tests') return { title: 'Assessments Management', category: 'Examination Scheduling' };
    if (pathname === '/admin/questions') return { title: 'Question Bank', category: 'Problem Authoring' };
    if (pathname.startsWith('/admin/rankings')) return { title: 'First Completion Rankings', category: 'Leaderboard' };
    if (pathname === '/admin/analytics') return { title: 'Cohort Analytics', category: 'Intelligence' };
    if (pathname === '/admin/reports') return { title: 'Reports & Export Center', category: 'Grade Sheets' };
    if (pathname === '/admin/logs') return { title: 'Security Audit Stream', category: 'Anti-Cheating Telemetry' };

    return { title: 'JIT CodeArena', category: 'Jansons Institute of Technology' };
  };

  const { title, category } = getPageTitle();

  interface NavItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    isLive?: boolean;
  }

  const studentNavItems: NavItem[] = [
    { label: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
    { label: 'Assessments', href: '/student/assessments', icon: FileCode },
    { label: 'My Analytics', href: '/student/analytics', icon: BarChart3 },
    { label: 'Profile', href: '/student/profile', icon: User },
  ];

  const adminNavItems: NavItem[] = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Live Monitor', href: '/admin/monitor', icon: Activity, isLive: true },
    { label: 'Students', href: '/admin/students', icon: Users },
    { label: 'Assessments', href: '/admin/tests', icon: Layers },
    { label: 'Question Bank', href: '/admin/questions', icon: BookOpen },
    { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Reports', href: '/admin/reports', icon: FileSpreadsheet },
    { label: 'Audit Logs', href: '/admin/logs', icon: ShieldAlert },
  ];

  const currentNavItems: NavItem[] = isStudentPortal ? studentNavItems : isAdminPortal ? adminNavItems : [];

  return (
    <div className="min-h-screen flex flex-col bg-[#070A12] text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* ========================================================================= */}
      {/* 1. PORTAL SHELL (STUDENT & ADMIN SIDEBARS + TOP BAR)                      */}
      {/* ========================================================================= */}
      {isPortalLayout ? (
        <div className="flex-1 flex w-full">
          {/* DESKTOP SIDEBAR */}
          <aside className="hidden md:flex flex-col fixed top-0 left-0 bottom-0 w-64 bg-[#0B1020]/95 backdrop-blur-2xl border-r border-white/[0.08] z-40 select-none">
            {/* Sidebar Brand Header */}
            <div className="h-16 px-5 border-b border-white/[0.08] flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-9 h-9 p-0.5 rounded-xl bg-white/[0.04] border border-white/[0.12] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                  <img
                    src="/jit-logo.png"
                    alt="Jansons Institute of Technology Crest"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm tracking-tight text-white">JIT</span>
                    <span className="font-extrabold text-sm tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                      CodeArena
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium truncate">
                    {isAdminPortal ? 'Administration' : 'Student Portal'}
                  </p>
                </div>
              </Link>
            </div>

            {/* Navigation Section */}
            <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Menu
              </div>
              {currentNavItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && item.href !== '/student/dashboard' && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600/20 to-violet-600/10 text-white border border-indigo-500/30 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive
                            ? 'text-indigo-400'
                            : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.isLive && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        LIVE
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Sidebar Bottom Controls */}
            <div className="p-3 border-t border-white/[0.08] space-y-1 bg-black/20">
              {isStudentPortal && (
                <button
                  onClick={() => setShowHelpModal(true)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition text-left"
                >
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  <span>Exam Support / Help</span>
                </button>
              )}

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>

          {/* MAIN COLUMN (TOPBAR + CONTENT) */}
          <div className="flex-1 flex flex-col md:pl-64 min-w-0">
            {/* TOP BAR */}
            <header className="sticky top-0 z-30 h-16 bg-[#070A12]/85 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-6 flex items-center justify-between">
              {/* Left: Mobile trigger & Breadcrumbs */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.05]"
                  aria-label="Toggle navigation menu"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>

                <div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                    <span>{category}</span>
                    <span>/</span>
                  </div>
                  <h1 className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
                    {title}
                  </h1>
                </div>
              </div>

              {/* Right: Actions, Connection Pill & Identity */}
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Connection Status Pill */}
                <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Connected</span>
                </div>

                {/* Notifications trigger */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.05] transition relative"
                    title="System Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-[#070A12]" />
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-72 bg-[#0B1020] border border-white/[0.1] rounded-2xl p-4 shadow-2xl z-50 text-xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                        <span className="font-bold text-white">Notifications</span>
                        <span className="text-[10px] text-emerald-400 font-mono">System Active</span>
                      </div>
                      <div className="space-y-2 text-slate-300">
                        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                          <p className="font-semibold text-white">Live Examination Engine</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Automated evaluation runtime is operating normally with server-side Judge0 sandboxing.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* User Identity Pill */}
                {user && (
                  <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-white/[0.08]">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                      {user.full_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-xs font-semibold text-white leading-tight">
                        {user.full_name || 'Candidate'}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400">
                        {role === 'admin' ? 'Administrator' : user.register_number}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </header>

            {/* MOBILE SIDEBAR DRAWER */}
            {mobileMenuOpen && (
              <div className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col">
                <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0B1020]">
                  <div className="flex items-center gap-2.5">
                    <img src="/jit-logo.png" alt="JIT Logo" className="w-8 h-8 object-contain" />
                    <span className="font-bold text-white text-sm">JIT CodeArena</span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 p-4 space-y-2 overflow-y-auto bg-[#070A12]">
                  {currentNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.05]"
                      >
                        <Icon className="w-5 h-5 text-indigo-400" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 text-left mt-6"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}

            {/* PAGE CONTENT CONTAINER */}
            <main className="flex-1 flex flex-col">{children}</main>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 2. PUBLIC TOP NAVIGATION (LANDING, LOGIN, REGISTER, INSTRUCTIONS, RESULTS)  */
        /* ========================================================================= */
        <>
          <header className="sticky top-0 z-40 bg-[#070A12]/80 backdrop-blur-xl border-b border-white/[0.08]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                {/* Brand Logo with College Seal */}
                <Link href="/" className="flex items-center gap-3 group">
                  <div className="w-10 h-10 p-0.5 rounded-xl bg-white/[0.04] border border-white/[0.12] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                    <img
                      src="/jit-logo.png"
                      alt="Jansons Institute of Technology Crest"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-base tracking-tight text-white">JIT</span>
                      <span className="font-extrabold text-base tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400">
                        CodeArena
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded font-mono font-semibold">
                        v2.0
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 tracking-wider uppercase font-medium">
                      Jansons Institute of Technology
                    </p>
                  </div>
                </Link>

                {/* Right Action Items */}
                <div className="flex items-center gap-3">
                  {user ? (
                    <div className="flex items-center gap-3">
                      <Link
                        href={role === 'student' ? '/student/dashboard' : '/admin/dashboard'}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/25 flex items-center gap-2"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        <span>Go to Dashboard</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-white/[0.05] transition"
                        title="Sign Out"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <Link
                        href="/login"
                        className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-semibold rounded-xl transition shadow-md shadow-indigo-600/25"
                      >
                        Student Sign In
                      </Link>
                      <Link
                        href="/register"
                        className="px-3.5 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-semibold rounded-xl border border-white/[0.1] transition"
                      >
                        Register
                      </Link>
                      <Link
                        href="/admin/login"
                        className="hidden sm:inline-flex px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-xl border border-amber-500/30 transition"
                      >
                        Exam Cell Portal
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 flex flex-col">{children}</main>
        </>
      )}

      {/* Support / Help Modal for Students */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B1020] border border-white/[0.1] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2 text-indigo-400 font-bold">
                <HelpCircle className="w-5 h-5" />
                <span>Examination Support</span>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-slate-300 space-y-2.5">
              <p>
                <strong>Jansons Institute of Technology Examination Cell</strong>
              </p>
              <p className="text-slate-400 leading-relaxed">
                If you encounter any network interruption, browser crash, or timer discrepancies during an active assessment, notify your hall invigilator immediately.
              </p>
              <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-1 font-mono text-[11px] text-slate-300">
                <p>• Code autosaves to server every 10 seconds</p>
                <p>• Fullscreen mode is strictly monitored</p>
                <p>• Tab switching triggers anti-cheating alerts</p>
              </div>
            </div>
            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

