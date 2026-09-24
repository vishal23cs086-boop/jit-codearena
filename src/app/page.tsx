'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { MOCK_STUDENTS } from '@/lib/mockData';
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
} from 'lucide-react';

export default function HomePage() {
  const { loginAsStudent, loginAsAdmin } = useAuth();
  const router = useRouter();

  const handleQuickStudentLogin = (regNo: string) => {
    loginAsStudent(regNo);
    router.push('/student/dashboard');
  };

  const handleAdminLogin = () => {
    loginAsAdmin();
    router.push('/admin/dashboard');
  };

  return (
    <div className="flex-1 flex flex-col justify-between">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Glow ambient background effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Academic Year 2025-2026 • 2nd & 3rd Year Assessment Portal</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight sm:leading-none mb-6">
            JIT <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400">CodeArena</span>
          </h1>

          <p className="text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto mb-8">
            The next-generation college-specific Python assessment platform. Featuring an integrated LeetCode-style Monaco editor, secure server-isolated Judge0 execution, real-time proctoring telemetry, and automated multi-metric grading.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/student/test/test-jit-py-2026/instructions"
              className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition shadow-lg shadow-indigo-600/30 text-sm"
            >
              <Terminal className="w-4 h-4" />
              <span>Launch Live Test Arena</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={handleAdminLogin}
              className="flex items-center gap-2 px-6 py-3.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 transition text-sm shadow-md"
            >
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Invigilator & Admin Center</span>
            </button>
          </div>
        </div>

        {/* Quick Student Login Selector */}
        <div className="max-w-4xl mx-auto bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-2xl">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-400" />
                <span>Select Registered Student Demo Profile</span>
              </h2>
              <p className="text-xs text-slate-400">
                Pre-configured 2nd and 3rd year engineering candidates for testing
              </p>
            </div>
            <Link
              href="/student/dashboard"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
            >
              Go to Dashboard →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MOCK_STUDENTS.map((st) => (
              <button
                key={st.id}
                onClick={() => handleQuickStudentLogin(st.register_number)}
                className="text-left p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 transition group flex items-start justify-between"
              >
                <div>
                  <div className="font-semibold text-white text-sm group-hover:text-indigo-300 transition">
                    {st.full_name}
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    Reg: {st.register_number}
                  </div>
                  <div className="text-[11px] text-indigo-400/90 font-medium mt-1">
                    {st.department} • Year {st.year} (Sec {st.section})
                  </div>
                </div>
                <div className="w-7 h-7 rounded-lg bg-slate-800 group-hover:bg-indigo-600/20 text-slate-400 group-hover:text-indigo-400 flex items-center justify-center transition">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            ))}

            {/* Admin option card */}
            <button
              onClick={handleAdminLogin}
              className="text-left p-3.5 rounded-xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/30 hover:border-indigo-400 transition group flex items-start justify-between"
            >
              <div>
                <div className="font-semibold text-amber-300 text-sm">
                  Dr. M. Murugan
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  FAC-CSE-01 (Admin)
                </div>
                <div className="text-[11px] text-amber-400/90 font-medium mt-1">
                  HOD / Chief Invigilator
                </div>
              </div>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center transition">
                <Shield className="w-3.5 h-3.5" />
              </div>
            </button>
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
        <p>© 2026 JIT CodeArena • Department of Computer Science & Engineering • All rights reserved</p>
      </footer>
    </div>
  );
}
