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
          {/* Floating Official Jansons Institute of Technology Logo & Header */}
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="animate-subtle-float p-3 sm:p-4 bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200/90 shadow-md shadow-slate-900/5 hover:shadow-lg transition-all duration-300 flex items-center justify-center">
              <img
                src="/jit-logo.png"
                alt="Jansons Institute of Technology Crest"
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain filter drop-shadow-sm"
              />
            </div>
            <div className="mt-3 text-center space-y-0.5">
              <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-800">
                JANSONS INSTITUTE OF TECHNOLOGY
              </h2>
              <p className="text-xs font-semibold text-indigo-600">
                JIT CodeArena • 2026–2027
              </p>
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

          {/* Institutional Information Card */}
          <div className="max-w-2xl mx-auto mb-8 p-5 sm:p-6 bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/90 shadow-sm text-left">
            <div className="text-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                Jansons Institute of Technology
              </h3>
              <p className="text-xs font-semibold text-indigo-600 mt-0.5">
                JIT CodeArena • Institutional Online Coding Assessment Platform
              </p>
              <p className="text-xs text-slate-600 mt-1 max-w-lg mx-auto">
                Official institutional platform for conducting secure Python programming assessments, candidate evaluation, automated scoring, invigilation monitoring, and performance analysis.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Institution</span>
                <span className="font-semibold text-slate-800">Jansons Institute of Technology</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Platform</span>
                <span className="font-semibold text-indigo-600">JIT CodeArena</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Assessment Type</span>
                <span className="font-semibold text-slate-800">Online Python Coding Assessment</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Academic Session</span>
                <span className="font-semibold text-slate-800">2026–2027</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Assessment Mode</span>
                <span className="font-semibold text-emerald-700">Secure Online Evaluation</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Department</span>
                <span className="font-semibold text-slate-800">Computer Science and Engineering</span>
              </div>
            </div>
          </div>

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

      {/* Institutional Information Footer */}
      <footer className="border-t border-slate-200/90 bg-white/70 backdrop-blur-md py-6 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-600">
        <div className="max-w-4xl mx-auto space-y-1.5">
          <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
            JANSONS INSTITUTE OF TECHNOLOGY
          </p>
          <p className="font-semibold text-indigo-600 text-xs">
            JIT CodeArena • Institutional Online Coding Assessment Platform
          </p>
          <p className="text-[11px] text-slate-500">
            Academic Session: 2026–2027 • Department of Computer Science and Engineering
          </p>
        </div>
      </footer>
    </div>
  );
}
