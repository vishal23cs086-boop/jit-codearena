'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchStudents, fetchTests, fetchAttempts, fetchActivityLogs } from '@/lib/db';
import { StudentProfile, Test, TestAttempt, ActivityLog } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';
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
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [stData, testData, attData, logData] = await Promise.all([
          fetchStudents(),
          fetchTests(),
          fetchAttempts(),
          fetchActivityLogs(),
        ]);
        setStudents(stData);
        setTests(testData);
        setAttempts(attData);
        setLogs(logData);
      } catch (err) {
        console.warn('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalStudents = students.length;
  const activeTests = tests.filter((t) => t.status === 'active');
  const activeAssessmentsCount = activeTests.length;
  const inProgressAttempts = attempts.filter((a) => a.status === 'in_progress').length;
  const completedAttempts = attempts.filter(
    (a) => a.status === 'submitted' || a.status === 'auto_submitted'
  );
  const completedAttemptsCount = completedAttempts.length;

  const avgScore =
    completedAttemptsCount > 0
      ? (
          completedAttempts.reduce((acc, a) => acc + (a.score || 0), 0) / completedAttemptsCount
        ).toFixed(1)
      : null;

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
              <span>JANSONS INSTITUTE OF TECHNOLOGY • EXAMINATION CONTROL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Administration Control Center
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Real-time assessment invigilation, score compilation, and candidate management
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
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
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/90 shadow-sm shadow-slate-900/5 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Students</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200/60 flex items-center justify-center">
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{totalStudents}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Registered candidates</span>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/90 shadow-sm shadow-slate-900/5 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Tests</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center">
              <Play className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">{activeAssessmentsCount}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Live examinations</span>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/90 shadow-sm shadow-slate-900/5 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">In-Progress</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600">{inProgressAttempts}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Writing code now</span>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/90 shadow-sm shadow-slate-900/5 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Completed</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600">{completedAttemptsCount}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Submitted attempts</span>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/90 shadow-sm shadow-slate-900/5 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Average Score</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200/60 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {avgScore !== null ? `${avgScore}` : '—'}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {avgScore !== null ? 'Institutional cohort avg' : 'No submissions yet'}
          </span>
        </div>
      </div>

      {/* Middle Section: Active Test Overview & Security Log Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Test Card */}
        <div className="lg:col-span-2 bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-7 space-y-5 border border-slate-200/90 shadow-sm shadow-slate-900/5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="font-bold text-slate-900 text-base">Active Examination Overview</h3>
            </div>
            <Link
              href="/admin/monitor"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition flex items-center gap-1.5"
            >
              <span>Live Telemetry</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {activeTests.length > 0 ? (
            <div className="space-y-4">
              {activeTests.map((t) => (
                <div key={t.id} className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-4">
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">{t.title}</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{t.description}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs font-mono bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                    <div>
                      <span className="text-slate-500 block mb-1 text-[11px] uppercase tracking-wider font-semibold">Duration</span>
                      <span className="font-bold text-slate-900">{t.duration_minutes} Mins</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1 text-[11px] uppercase tracking-wider font-semibold">Total Marks</span>
                      <span className="font-bold text-emerald-600">{t.total_marks} Marks</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1 text-[11px] uppercase tracking-wider font-semibold">Eligible Cohorts</span>
                      <span className="font-bold text-indigo-600 truncate block">
                        {t.eligible_departments?.join(', ')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Link
                      href={`/admin/rankings/${t.id}`}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition shadow-sm shadow-indigo-600/20"
                    >
                      View Completion Rankings
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No active examination right now"
              description="Scheduled examinations can be published or started from the Assessments tab."
              action={{
                label: "View Assessments",
                href: "/admin/tests",
              }}
            />
          )}
        </div>

        {/* Security Incident Highlights */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-7 space-y-5 border border-slate-200/90 shadow-sm shadow-slate-900/5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <span>Real-Time Security Feed</span>
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono font-semibold">
              Live
            </span>
          </div>

          {logs.length > 0 ? (
            <div className="space-y-3 font-mono text-xs max-h-80 overflow-y-auto pr-1">
              {logs.slice(0, 6).map((l) => (
                <div key={l.id} className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-1.5 hover:border-slate-300 transition">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-700 text-[11px]">{l.event_type}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-sans truncate">
                    {typeof l.details === 'object' ? JSON.stringify(l.details) : 'Event recorded'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No activity recorded"
              description="Anti-cheating deterrent events, submissions, and session alerts will be captured here."
            />
          )}
        </div>
      </div>
    </div>
  );
}
