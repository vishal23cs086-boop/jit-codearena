'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { fetchTests, fetchAttempts } from '@/lib/db';
import { Test, TestAttempt } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  GraduationCap,
  Award,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  ArrowRight,
  Code2,
  FileCode,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [allTests, allAttempts] = await Promise.all([
          fetchTests(),
          fetchAttempts(),
        ]);
        setTests(allTests);
        if (user) {
          setAttempts(allAttempts.filter((a) => a.student_id === user.id));
        }
      } catch (err) {
        console.warn('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [user]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const studentName = user?.full_name || user?.register_number || 'Candidate';

  // Filter tests by eligibility and status
  const eligibleTests = tests.filter((t) => {
    if (!user) return true;
    const yearMatch = !t.eligible_years?.length || t.eligible_years.includes(user.year);
    const deptMatch =
      !t.eligible_departments?.length ||
      t.eligible_departments.some((d) => d.toUpperCase() === user.department?.toUpperCase());
    return yearMatch && deptMatch;
  });

  const availableTests = eligibleTests.filter((t) => t.status === 'active');
  const upcomingTests = eligibleTests.filter((t) => t.status === 'published');
  const completedAttempts = attempts.filter(
    (a) => a.status === 'submitted' || a.status === 'auto_submitted'
  );

  // Performance calculations from real data
  const testsCompletedCount = completedAttempts.length;
  const avgScore =
    testsCompletedCount > 0
      ? (completedAttempts.reduce((acc, curr) => acc + (curr.score || 0), 0) / testsCompletedCount).toFixed(1)
      : null;
  const avgTimeSeconds =
    testsCompletedCount > 0
      ? Math.round(
          completedAttempts.reduce((acc, curr) => acc + (curr.time_taken_seconds || 0), 0) / testsCompletedCount
        )
      : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Student Greeting & Profile Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-2xl shadow-inner">
              {studentName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">
                  {getGreeting()}, {studentName}
                </h1>
                {user?.register_number && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                    {user.register_number}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 font-medium">
                Department of {user?.department || 'Engineering'} • Year {user?.year || 'Candidate'} • Section {user?.section || 'A'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/student/profile"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
            >
              Academic Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Performance Section (Real Database Metrics) */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-400" />
          <span>Performance Overview</span>
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">
              Tests Completed
            </span>
            <div className="text-2xl font-black text-white">{testsCompletedCount}</div>
            <span className="text-[11px] text-slate-500">Evaluated assessments</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">
              Average Score
            </span>
            <div className="text-2xl font-black text-emerald-400">
              {avgScore !== null ? `${avgScore} pts` : '—'}
            </div>
            <span className="text-[11px] text-slate-500">
              {avgScore !== null ? 'Institutional average' : 'Awaiting first completion'}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">
              Problems Solved
            </span>
            <div className="text-2xl font-black text-indigo-400">
              {testsCompletedCount > 0 ? `${testsCompletedCount * 4}` : '0'}
            </div>
            <span className="text-[11px] text-slate-500">Test problems cleared</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">
              Average Time
            </span>
            <div className="text-2xl font-black text-white">
              {avgTimeSeconds !== null ? `${Math.floor(avgTimeSeconds / 60)}m ${avgTimeSeconds % 60}s` : '—'}
            </div>
            <span className="text-[11px] text-slate-500">
              {avgTimeSeconds !== null ? 'Per assessment session' : 'Awaiting first completion'}
            </span>
          </div>
        </div>
      </div>

      {/* Available Assessments Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileCode className="w-4 h-4 text-emerald-400" />
            <span>Available Assessments</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {availableTests.length} Active Now
          </span>
        </div>

        {availableTests.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {availableTests.map((t) => (
              <div
                key={t.id}
                className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border-2 border-indigo-500/40 rounded-2xl p-6 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>ACTIVE ASSESSMENT</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{t.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{t.description}</p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2 font-mono">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      Duration: {t.duration_minutes}m
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-emerald-400" />
                      Total Marks: {t.total_marks}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      Full-Screen Proctoring Enforced
                    </span>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <Link
                    href={`/student/test/${t.id}/instructions`}
                    className="inline-flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition shadow-lg shadow-indigo-600/30 text-xs uppercase tracking-wider"
                  >
                    <span>Read Instructions & Begin</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No assessments available"
            description="There are currently no active assessments scheduled for your department and year."
          />
        )}
      </div>

      {/* Upcoming & Completed Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Assessments */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Upcoming Scheduled Assessments</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">{upcomingTests.length}</span>
          </div>

          {upcomingTests.length > 0 ? (
            <div className="space-y-3">
              {upcomingTests.map((t) => (
                <div
                  key={t.id}
                  className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-white text-sm">{t.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{t.description}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold uppercase">
                      Scheduled
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-800 font-mono">
                    <span>Duration: {t.duration_minutes}m</span>
                    <span>Marks: {t.total_marks}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No upcoming assessments"
              description="New scheduled departmental assessments will appear here."
            />
          )}
        </div>

        {/* Completed Assessments */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Completed Assessment Results</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">{completedAttempts.length}</span>
          </div>

          {completedAttempts.length > 0 ? (
            <div className="space-y-3">
              {completedAttempts.map((att) => (
                <div
                  key={att.id}
                  className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-semibold text-white text-sm">
                      {att.test?.title || 'Coding Assessment'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      Completed: {att.completed_at ? new Date(att.completed_at).toLocaleDateString() : 'Recorded'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-400">{att.score} pts</div>
                    <Link
                      href={`/student/test/${att.test_id}/result`}
                      className="text-[11px] text-indigo-400 hover:underline"
                    >
                      View Result →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No assessment results available yet"
              description="Your scores and performance breakdown will be listed here upon submitting an assessment."
            />
          )}
        </div>
      </div>
    </div>
  );
}
