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
      <section className="relative overflow-hidden pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Glow ambient background effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-indigo-100/50 blur-[130px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-1/4 w-[350px] h-[300px] bg-sky-100/40 blur-[110px] rounded-full pointer-events-none -z-10" />

        <div className="text-center max-w-3xl mx-auto mb-16">
          {/* Official College Crest */}
          <div className="flex justify-center mb-6">
            <div className="p-3.5 bg-white shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200/90 ring-1 ring-slate-100 group hover:border-indigo-400 transition-all duration-300">
              <img
                src="/jit-logo.png"
                alt="Jansons Institute of Technology Crest"
                className="w-24 h-24 sm:w-28 sm:h-28 object-contain filter drop-shadow-sm group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-6 backdrop-blur-md shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
            <span>Academic Year 2026–2027 • 2nd & 3rd Year Assessment Portal</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-tight sm:leading-none mb-3">
            JIT <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-800">CodeArena</span>
          </h1>

          <p className="text-xs sm:text-sm font-bold text-indigo-600 uppercase tracking-widest mb-6">
            Institutional Online Coding Assessment Platform
          </p>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto mb-8 font-normal">
            The official institutional online coding assessment platform of JIT. Equipped with server-isolated Python execution, real-time invigilation audit telemetry, and automated completion-order rank tracking.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {user ? (
              role === 'student' ? (
                <Link
                  href="/student/dashboard"
                  className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition shadow-md shadow-indigo-600/25 text-sm"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Open Student Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  href="/admin/dashboard"
                  className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition shadow-md shadow-indigo-600/25 text-sm"
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
                  className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition shadow-md shadow-indigo-600/25 text-sm hover:scale-[1.02]"
                >
                  <Terminal className="w-4 h-4" />
                  <span>Candidate Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/register"
                  className="flex items-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-800 font-semibold rounded-xl border border-slate-200 transition text-sm shadow-xs hover:border-slate-300"
                >
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>Student Registration</span>
                </Link>

                <Link
                  href="/admin/login"
                  className="flex items-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-800 font-semibold rounded-xl border border-slate-200 transition text-sm shadow-xs hover:border-slate-300"
                >
                  <Shield className="w-4 h-4 text-amber-600" />
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
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Candidate Portal
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1.5 group-hover:text-indigo-600 transition-colors">
                  Student Assessment Portal
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Access scheduled assessments, launch the Monaco Python editor, and view instant performance scorecards.
                </p>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs text-slate-700">
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Roll Number + Academic Password sign-in</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Mandatory fullscreen & proctoring telemetry</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Automated testcase evaluation & score breakdown</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center gap-3">
              <Link
                href="/login"
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-center text-xs transition shadow-md shadow-indigo-600/20"
              >
                Sign In to Test
              </Link>
              <Link
                href="/register"
                className="py-3 px-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-center text-xs border border-slate-200 transition shadow-xs"
              >
                New Registration
              </Link>
            </div>
          </div>

          {/* Exam Cell / Faculty Portal */}
          <div className="glass-card-hover rounded-3xl p-7 sm:p-8 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  Staff & Invigilation
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1.5 group-hover:text-amber-700 transition-colors">
                  Examination Control Center
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Authorized portal for Examination Coordinators, HODs, and Invigilators to monitor live tests and evaluate results.
                </p>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs text-slate-700">
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Real-time Live Monitor with live status badges</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Question Bank with hidden test cases management</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>First Completion Rankings & CSV Grade Sheet Export</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center gap-3">
              <Link
                href="/admin/login"
                className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-center text-xs transition shadow-md shadow-amber-600/20"
              >
                Enter Examination Cell Portal →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillar Highlights */}
      <section className="border-t border-slate-200/80 py-14 px-4 sm:px-6 lg:px-8 bg-slate-50/60">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card rounded-3xl p-6">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mb-4">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1.5">LeetCode-Grade Coding</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Monaco-powered Python editor with syntax highlighting, custom testcase execution, and zero client leakage of hidden test assertions.
            </p>
          </div>

          <div className="glass-card rounded-3xl p-6">
            <div className="w-11 h-11 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center mb-4">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1.5">Live Invigilation Monitor</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Real-time audit log tracking tab switches, fullscreen departures, and copy-paste deterrent incidents for every student session.
            </p>
          </div>

          <div className="glass-card rounded-3xl p-6">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mb-4">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1.5">First Completion Tracking</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Server-side timestamping records exact finish order (1st, 2nd, 3rd completed) with automated multi-factor scoring (correctness, time, code quality).
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-500">
        <p>© 2026 JIT CodeArena • Institutional Online Coding Assessment Platform • Department of Computer Science & Engineering</p>
      </footer>
    </div>
  );
}
