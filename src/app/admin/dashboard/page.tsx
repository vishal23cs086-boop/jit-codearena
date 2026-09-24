'use client';

import React from 'react';
import Link from 'next/link';
import { MOCK_STUDENTS, MOCK_TESTS, MOCK_LIVE_MONITOR } from '@/lib/mockData';
import {
  Users,
  Activity,
  Play,
  CheckCircle2,
  Clock,
  Award,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  FileSpreadsheet,
  Layers,
  BookOpen,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const totalStudents = 120;
  const activeStudents = 1;
  const testsRunning = 1;
  const completedTests = 2;
  const notStarted = 1;
  const averageScore = 79.4;
  const highestScore = 96.5;
  const averageCompletionTime = '37m 45s';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-2">
            <Activity className="w-3.5 h-3.5" />
            <span>EXAMINATION CONTROL CENTER • ACADEMIC YEAR 2025-2026</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Department Assessment Controller
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time assessment invigilation, score compilation, and security telemetry
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/monitor"
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-emerald-600/20"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>Open Live Monitor</span>
          </Link>
          <Link
            href="/admin/reports"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-700"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </Link>
        </div>
      </div>

      {/* Main KPI Statistics Grid (Requirement #8) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Candidates</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalStudents}</div>
          <span className="text-[11px] text-slate-400">2nd & 3rd Year Engineers</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active in Exam</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{activeStudents}</div>
          <span className="text-[11px] text-emerald-400/90 font-medium">Currently writing code</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tests Running</span>
            <Play className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{testsRunning} Active</div>
          <span className="text-[11px] text-slate-400">1 Upcoming scheduled</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed Tests</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{completedTests} Finished</div>
          <span className="text-[11px] text-slate-400">Recorded on server</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Not Started</span>
            <Clock className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-black text-slate-300">{notStarted}</div>
          <span className="text-[11px] text-slate-500">Pending login</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Class Average</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{averageScore}%</div>
          <span className="text-[11px] text-emerald-400 font-medium">Above college benchmark</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Highest Score</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300">{highestScore} pts</div>
          <span className="text-[11px] text-slate-400">Harish Kumar (22CS084)</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Completion Time</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{averageCompletionTime}</div>
          <span className="text-[11px] text-slate-400">Limit: 60m 00s</span>
        </div>
      </div>

      {/* Middle Grid: Running Test Card & Anti-Cheating Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Test Card */}
        <div className="lg:col-span-2 bg-gradient-to-br from-indigo-950/30 to-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <h3 className="font-bold text-white text-base">Current Active Examination</h3>
            </div>
            <Link
              href="/admin/monitor"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1"
            >
              <span>Live Telemetry</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div>
            <h4 className="text-lg font-bold text-white">JIT Python Assessment 2026 - Cycle 1</h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Official assessment for 2nd and 3rd year engineering students (CSE, IT, AI&DS, ECE). Covers 4 algorithmic challenges (Lists, DSA Stack, Palindromes, Kadane).
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs font-mono bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <div>
              <span className="text-slate-400 block mb-0.5">Enrolled Candidates</span>
              <span className="font-bold text-white text-sm">5 Candidates</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Submissions Today</span>
              <span className="font-bold text-emerald-400 text-sm">16 Evaluated</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Time Allotted</span>
              <span className="font-bold text-white text-sm">60 Minutes</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Judge0 Python 3 Runner: Healthy & Online</span>
            </div>
            <Link
              href="/admin/rankings/test-jit-py-2026"
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition"
            >
              View First-Completion Leaderboard
            </Link>
          </div>
        </div>

        {/* Security Incident Highlights */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <span>Security Event Stream</span>
            </h3>
            <span className="text-xs text-amber-400 font-mono">Live Logs</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300">Vignesh Raman (22AD012)</span>
                <span className="text-[10px] text-slate-500">10:32 AM</span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans">
                Fullscreen exit recorded (Warning #4 issued)
              </p>
            </div>

            <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300">Priya Sundaram (23IT045)</span>
                <span className="text-[10px] text-slate-500">10:28 AM</span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans">
                Tab switched away for 4 seconds
              </p>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400">Harish Kumar (22CS084)</span>
                <span className="text-[10px] text-slate-500">10:36 AM</span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans">
                Finished 1st with score 96.5 (Clean audit)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
