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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-2">
            <Activity className="w-3.5 h-3.5" />
            <span>EXAMINATION CONTROL CENTER • INSTITUTIONAL PORTAL</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Administration Control Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time assessment invigilation, score compilation, and candidate management
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
            <span>Export Reports</span>
          </Link>
        </div>
      </div>

      {/* Main KPI Statistics Grid (Requirement #11) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Students</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalStudents}</div>
          <span className="text-[11px] text-slate-500">Registered candidates</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Tests</span>
            <Play className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{activeAssessmentsCount}</div>
          <span className="text-[11px] text-slate-500">Live examinations</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">In-Progress</span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-amber-300">{inProgressAttempts}</div>
          <span className="text-[11px] text-slate-500">Writing code now</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-blue-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-300">{completedAttemptsCount}</div>
          <span className="text-[11px] text-slate-500">Submitted attempts</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Score</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {avgScore !== null ? `${avgScore} pts` : '—'}
          </div>
          <span className="text-[11px] text-slate-500">
            {avgScore !== null ? 'Institutional cohort avg' : 'No submissions yet'}
          </span>
        </div>
      </div>

      {/* Middle Section: Active Test Overview & Security Log Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Test Card */}
        <div className="lg:col-span-2 bg-gradient-to-br from-indigo-950/30 to-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <h3 className="font-bold text-white text-base">Active Examination Overview</h3>
            </div>
            <Link
              href="/admin/monitor"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1"
            >
              <span>Live Telemetry</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {activeTests.length > 0 ? (
            <div className="space-y-4">
              {activeTests.map((t) => (
                <div key={t.id} className="space-y-3">
                  <div>
                    <h4 className="text-lg font-bold text-white">{t.title}</h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{t.description}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs font-mono bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Duration</span>
                      <span className="font-bold text-white">{t.duration_minutes} Minutes</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Total Marks</span>
                      <span className="font-bold text-emerald-400">{t.total_marks} Marks</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Eligible Cohorts</span>
                      <span className="font-bold text-indigo-300">
                        {t.eligible_departments?.join(', ')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Link
                      href={`/admin/rankings/${t.id}`}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
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
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <span>Real-Time Security Feed</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">Live</span>
          </div>

          {logs.length > 0 ? (
            <div className="space-y-3 font-mono text-xs max-h-72 overflow-y-auto">
              {logs.slice(0, 5).map((l) => (
                <div key={l.id} className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 text-[11px]">{l.event_type}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans">
                    {typeof l.details === 'object' ? JSON.stringify(l.details) : 'Event recorded'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No activity recorded."
              description="Anti-cheating deterrent events, submissions, and session alerts will be captured here."
            />
          )}
        </div>
      </div>
    </div>
  );
}
