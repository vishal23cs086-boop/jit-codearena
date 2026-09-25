'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Activity,
  Play,
  CheckCircle2,
  Clock,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  FileSpreadsheet,
  Layers,
  BookOpen,
  Radio,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

interface DashboardStats {
  totalStudents: number;
  onlineCount: number;
  inAssessmentCount: number;
  completedAttempts: number;
  totalViolations: number;
  recentLogs: Array<{
    id: string;
    student_name: string;
    register_number: string;
    event_type: string;
    description: string;
    timestamp: string;
  }>;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    onlineCount: 0,
    inAssessmentCount: 0,
    completedAttempts: 0,
    totalViolations: 0,
    recentLogs: [],
  });
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [statsRes, assessRes] = await Promise.all([
        fetch('/api/admin/dashboard-stats'),
        fetch('/api/admin/assessments'),
      ]);
      const statsJson = await statsRes.json();
      const assessJson = await assessRes.json();

      if (statsJson.success && statsJson.stats) {
        setStats(statsJson.stats);
      }
      if (assessJson.success && Array.isArray(assessJson.assessments)) {
        setAssessments(assessJson.assessments);
      }
    } catch (err) {
      console.warn('Dashboard load error:', err);
    } finally {
      if (!silent) setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData(true);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const liveAssessments = assessments.filter((a) => a.status === 'live');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Header Banner */}
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden border border-slate-200/90 shadow-sm shadow-slate-900/5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/60 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-5 relative z-10">
          <div className="w-16 h-16 p-2 rounded-2xl bg-white border border-slate-200/80 shadow-md flex items-center justify-center shrink-0">
            <img
              src="/jit-logo.png"
              alt="Jansons Institute of Technology Crest"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-semibold mb-2">
              <Radio className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
              <span>JANSONS INSTITUTE OF TECHNOLOGY • EXAMINATION CELL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Administration Control Center
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Real-time assessment invigilation, Turso telemetry, and automated candidate evaluation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => loadData(false)}
            className="p-2.5 bg-white hover:bg-slate-50 rounded-xl text-slate-600 border border-slate-200 shadow-xs"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/admin/monitor"
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-emerald-600/20"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>Open Live Monitor</span>
          </Link>
          <Link
            href="/admin/reports"
            className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 transition border border-slate-200 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Reports</span>
          </Link>
        </div>
      </div>

      {/* Main KPI Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {/* Total Students */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/90 shadow-sm shadow-slate-900/5 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Students</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200/60 flex items-center justify-center">
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.totalStudents}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Registered in Turso</span>
        </div>

        {/* Online Now */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/90 shadow-sm shadow-slate-900/5 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Online Now</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">{stats.onlineCount}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Active heartbeats</span>
        </div>

        {/* In Assessment */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/90 shadow-sm shadow-slate-900/5 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">In Assessment</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center">
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600">{stats.inAssessmentCount}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Attempting tests</span>
        </div>

        {/* Completed Attempts */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/90 shadow-sm shadow-slate-900/5 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Completed</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200/60 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-600">{stats.completedAttempts}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Finalized submissions</span>
        </div>

        {/* Security Warnings */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/90 shadow-sm shadow-slate-900/5 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Violations</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200/60 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600">{stats.totalViolations}</div>
          <span className="text-[11px] text-rose-500 mt-1 block">Security anomalies</span>
        </div>
      </div>

      {/* Middle Section: Live Assessments & Live Event Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Test Overview */}
        <div className="lg:col-span-2 bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-7 space-y-5 border border-slate-200/90 shadow-sm shadow-slate-900/5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="font-bold text-slate-900 text-base">Active Examinations Overview</h3>
            </div>
            <Link
              href="/admin/tests"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition flex items-center gap-1.5"
            >
              <span>Manage All ({assessments.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {liveAssessments.length > 0 ? (
            <div className="space-y-4">
              {liveAssessments.map((t) => (
                <div key={t.id} className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">{t.title}</h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{t.description}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[10px] uppercase">
                      LIVE
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs font-mono bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                    <div>
                      <span className="text-slate-500 block mb-1 text-[11px] uppercase tracking-wider font-semibold">Duration</span>
                      <span className="font-bold text-slate-900">{t.duration} Mins</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1 text-[11px] uppercase tracking-wider font-semibold">Questions</span>
                      <span className="font-bold text-emerald-600">{t.question_count} Problems</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1 text-[11px] uppercase tracking-wider font-semibold">Participants</span>
                      <span className="font-bold text-indigo-600 block">{t.participant_count} Attempts</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Link
                      href="/admin/monitor"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition shadow-sm shadow-indigo-600/20"
                    >
                      Invigilate Candidates
                    </Link>
                    <span className="font-mono text-[11px] text-slate-400">Code: {t.code || t.id.slice(0, 8)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No active examination right now"
              description="Scheduled examinations can be published or started from the Assessments management console."
              action={{
                label: "Create or Publish Assessment",
                href: "/admin/tests",
              }}
            />
          )}
        </div>

        {/* Live Streaming Activity Feed */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-7 space-y-5 border border-slate-200/90 shadow-sm shadow-slate-900/5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <span>Live Audit Stream</span>
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono font-semibold">
              Turso Sync
            </span>
          </div>

          {stats.recentLogs && stats.recentLogs.length > 0 ? (
            <div className="space-y-3 font-mono text-xs max-h-96 overflow-y-auto pr-1">
              {stats.recentLogs.map((l) => (
                <div key={l.id} className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-1 hover:border-slate-300 transition">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-[11px] truncate max-w-[150px]">
                      {l.student_name || l.register_number}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1 py-0.2 bg-amber-100 text-amber-800 text-[9px] rounded font-bold uppercase">
                      {l.event_type}
                    </span>
                    <p className="text-[11px] text-slate-600 font-sans truncate">{l.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No events recorded yet"
              description="Anti-cheating deterrent telemetry, student logins, and evaluations will stream here live."
            />
          )}
        </div>
      </div>
    </div>
  );
}
