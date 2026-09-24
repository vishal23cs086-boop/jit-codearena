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
      <div className="glass-card rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-5 relative z-10">
          <div className="w-16 h-16 p-2 rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-md shadow-xl flex items-center justify-center shrink-0">
            <img
              src="/jit-logo.png"
              alt="Jansons Institute of Technology Crest"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
              <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>JANSONS INSTITUTE OF TECHNOLOGY • EXAMINATION CONTROL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Administration Control Center
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Real-time assessment invigilation, score compilation, and candidate management
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Link
            href="/admin/monitor"
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-emerald-500/20"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>Open Live Monitor</span>
          </Link>
          <Link
            href="/admin/reports"
            className="flex items-center gap-2 px-5 py-2.5 glass-card-hover rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition border border-white/10"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export Reports</span>
          </Link>
        </div>
      </div>

      {/* Main KPI Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="glass-card glass-card-hover rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Students</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{totalStudents}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Registered candidates</span>
        </div>

        <div className="glass-card glass-card-hover rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Active Tests</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Play className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">{activeAssessmentsCount}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Live examinations</span>
        </div>

        <div className="glass-card glass-card-hover rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">In-Progress</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400">{inProgressAttempts}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Writing code now</span>
        </div>

        <div className="glass-card glass-card-hover rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between text-blue-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Completed</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-400">{completedAttemptsCount}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Submitted attempts</span>
        </div>

        <div className="glass-card glass-card-hover rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Average Score</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {avgScore !== null ? `${avgScore}` : '—'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {avgScore !== null ? 'Institutional cohort avg' : 'No submissions yet'}
          </span>
        </div>
      </div>

      {/* Middle Section: Active Test Overview & Security Log Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Test Card */}
        <div className="lg:col-span-2 glass-card rounded-3xl p-6 sm:p-7 space-y-5 border border-white/10">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <h3 className="font-bold text-white text-base">Active Examination Overview</h3>
            </div>
            <Link
              href="/admin/monitor"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1.5"
            >
              <span>Live Telemetry</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {activeTests.length > 0 ? (
            <div className="space-y-4">
              {activeTests.map((t) => (
                <div key={t.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                  <div>
                    <h4 className="text-lg font-bold text-white">{t.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{t.description}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs font-mono bg-white/[0.02] p-4 rounded-xl border border-white/5">
                    <div>
                      <span className="text-slate-500 block mb-1">Duration</span>
                      <span className="font-bold text-white">{t.duration_minutes} Mins</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Total Marks</span>
                      <span className="font-bold text-emerald-400">{t.total_marks} Marks</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Eligible Cohorts</span>
                      <span className="font-bold text-indigo-400 truncate block">
                        {t.eligible_departments?.join(', ')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Link
                      href={`/admin/rankings/${t.id}`}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-indigo-600/20"
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
        <div className="glass-card rounded-3xl p-6 sm:p-7 space-y-5 border border-white/10">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <span>Real-Time Security Feed</span>
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
              Live
            </span>
          </div>

          {logs.length > 0 ? (
            <div className="space-y-3 font-mono text-xs max-h-80 overflow-y-auto pr-1">
              {logs.slice(0, 6).map((l) => (
                <div key={l.id} className="p-3.5 bg-white/[0.02] border border-white/10 rounded-xl space-y-1.5 hover:border-white/20 transition">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400 text-[11px]">{l.event_type}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans truncate">
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
