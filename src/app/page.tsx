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
      <section className="relative overflow-hidden pt-14 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Glow ambient background effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-indigo-600/15 blur-[140px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-1/4 w-[350px] h-[300px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="text-center max-w-3xl mx-auto mb-16">
          {/* Official College Crest */}
          <div className="flex justify-center mb-6">
            <div className="p-3.5 bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl ring-1 ring-white/10 group hover:border-indigo-500/30 transition-all duration-300">
              <img
                src="/jit-logo.png"
                alt="Jansons Institute of Technology Crest"
                className="w-24 h-24 sm:w-28 sm:h-28 object-contain filter drop-shadow-[0_4px_12px_rgba(99,102,241,0.25)] group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>Academic Year 2025–2026 • 2nd & 3rd Year Assessment Portal</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight sm:leading-none mb-3">
            JIT <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-300">CodeArena</span>
          </h1>

          <p className="text-xs sm:text-sm font-bold text-indigo-400 uppercase tracking-widest mb-6">
            Institutional Online Coding Assessment Platform
          </p>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto mb-8 font-normal">
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
                  className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition shadow-lg shadow-indigo-600/30 text-sm hover:scale-[1.02]"
                >
                  <Terminal className="w-4 h-4" />
                  <span>Candidate Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/register"
                  className="flex items-center gap-2 px-6 py-3.5 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 font-semibold rounded-xl border border-white/10 transition text-sm backdrop-blur-md hover:border-white/20"
                >
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Student Registration</span>
                </Link>

                <Link
                  href="/admin/login"
                  className="flex items-center gap-2 px-6 py-3.5 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 font-semibold rounded-xl border border-white/10 transition text-sm backdrop-blur-md hover:border-white/20"
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
          <div className="glass-card-hover rounded-3xl p-7 sm:p-8 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Candidate Portal
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-white mb-1.5 group-hover:text-indigo-300 transition-colors">
                  Student Assessment Portal
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Access scheduled assessments, launch the Monaco Python editor, and view instant performance scorecards.
                </p>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-white/[0.06] text-xs text-slate-300">
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Register Number + Academic Password sign-in</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Mandatory fullscreen & proctoring telemetry</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Automated testcase evaluation & score breakdown</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-white/[0.06] flex items-center gap-3">
              <Link
                href="/login"
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-center text-xs transition shadow-lg shadow-indigo-600/30"
              >
                Sign In to Test
              </Link>
              <Link
                href="/register"
                className="py-3 px-4 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-semibold rounded-xl text-center text-xs border border-white/10 transition"
              >
                New Registration
              </Link>
            </div>
          </div>

          {/* Exam Cell / Faculty Portal */}
          <div className="glass-card-hover rounded-3xl p-7 sm:p-8 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Staff & Invigilation
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-white mb-1.5 group-hover:text-amber-300 transition-colors">
                  Examination Control Center
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Authorized portal for Examination Coordinators, HODs, and Invigilators to monitor live tests and evaluate results.
                </p>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-white/[0.06] text-xs text-slate-300">
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Real-time Live Monitor with live status badges</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Question Bank with hidden test cases management</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>First Completion Rankings & CSV Grade Sheet Export</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-white/[0.06] flex items-center gap-3">
              <Link
                href="/admin/login"
                className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl text-center text-xs transition shadow-lg shadow-amber-600/30"
              >
                Enter Examination Cell Portal →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillar Highlights */}
      <section className="border-t border-white/[0.08] py-14 px-4 sm:px-6 lg:px-8 bg-black/20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card rounded-3xl p-6">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base mb-1.5">LeetCode-Grade Coding</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Monaco-powered Python editor with syntax highlighting, custom testcase execution, and zero client leakage of hidden test assertions.
            </p>
          </div>

          <div className="glass-card rounded-3xl p-6">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base mb-1.5">Live Invigilation Monitor</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time audit log tracking tab switches, fullscreen departures, and copy-paste deterrent incidents for every student session.
            </p>
          </div>

          <div className="glass-card rounded-3xl p-6">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base mb-1.5">First Completion Tracking</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Server-side timestamping records exact finish order (1st, 2nd, 3rd completed) with automated multi-factor scoring (correctness, time, code quality).
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-8 text-center text-xs text-slate-500">
        <p>© 2026 JIT CodeArena • Institutional Online Coding Assessment Platform • Department of Computer Science & Engineering</p>
      </footer>
    </div>
  );
}
