'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Code2,
  Terminal,
  Shield,
  Activity,
  Award,
  ArrowRight,
  BookOpen,
  CheckCircle,
  GraduationCap,
  Sparkles,
  Cpu,
  UserCheck,
  Lock,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';

export default function HomePage() {
  const { user, role } = useAuth();
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col justify-between">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Glow ambient background effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Academic Year 2025-2026 • 2nd & 3rd Year Assessment Portal</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight sm:leading-none mb-3">
            JIT <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400">CodeArena</span>
          </h1>

          <p className="text-sm sm:text-base font-semibold text-indigo-300 uppercase tracking-widest mb-6">
            Institutional Online Coding Assessment Platform
          </p>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto mb-8">
            The official institutional online coding assessment platform of JIT. Equipped with server-isolated Python execution, real-time invigilation audit telemetry, and automated completion-order rank tracking.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {user ? (
              role === 'student' ? (
                <Link
                  href="/student/dashboard"
                  className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition shadow-lg shadow-indigo-600/30 text-sm"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Open Student Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  href="/admin/dashboard"
                  className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition shadow-lg shadow-indigo-600/30 text-sm"
                >
                  <Shield className="w-4 h-4 text-amber-300" />
                  <span>Open Admin Control Center</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )
            ) : (
              <>
                <Link
                  href="/login"
                  className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition shadow-lg shadow-indigo-600/30 text-sm"
                >
                  <Terminal className="w-4 h-4" />
                  <span>Candidate Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/register"
                  className="flex items-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold rounded-xl border border-slate-700 transition text-sm shadow-md"
                >
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Student Registration</span>
                </Link>

                <Link
                  href="/admin/login"
                  className="flex items-center gap-2 px-6 py-3.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl border border-slate-700 transition text-sm shadow-md"
                >
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Exam Cell Login</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Institutional Portal Access Cards */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Student Access Portal */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-7 backdrop-blur-sm shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Candidate Portal
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-white mb-1">Student Assessment Portal</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Access scheduled assessments, launch the Monaco Python editor, and view instant performance scorecards.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Register Number + Academic Password sign-in</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Mandatory fullscreen & proctoring telemetry</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Automated testcase evaluation & score breakdown</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-800 flex items-center gap-3">
              <Link
                href="/login"
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-center text-xs transition shadow-md shadow-indigo-600/20"
              >
                Sign In to Test
              </Link>
              <Link
                href="/register"
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-center text-xs border border-slate-700 transition"
              >
                New Registration
              </Link>
            </div>
          </div>

          {/* Exam Cell / Faculty Portal */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-7 backdrop-blur-sm shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Staff & Invigilation
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-white mb-1">Examination Control Center</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Authorized portal for Examination Coordinators, HODs, and Invigilators to monitor live tests and evaluate results.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Real-time Live Monitor with live status badges</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Question Bank with hidden test cases management</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>First Completion Rankings & CSV Grade Sheet Export</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-800 flex items-center gap-3">
              <Link
                href="/admin/login"
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-semibold rounded-xl text-center text-xs transition shadow-md"
              >
                Enter Examination Cell Portal →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillar Highlights */}
      <section className="bg-slate-900/40 border-t border-slate-800/80 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base mb-1">LeetCode-Grade Coding</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Monaco-powered Python editor with syntax highlighting, custom testcase execution, and zero client leakage of hidden test assertions.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base mb-1">Live Invigilation Monitor</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time audit log tracking tab switches, fullscreen departures, and copy-paste deterrent incidents for every student session.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base mb-1">First Completion Tracking</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Server-side timestamping records exact finish order (1st, 2nd, 3rd completed) with automated multi-factor scoring (correctness, time, code quality).
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <p>© 2026 JIT CodeArena • Institutional Online Coding Assessment Platform • Department of Computer Science & Engineering</p>
      </footer>
    </div>
  );
}
