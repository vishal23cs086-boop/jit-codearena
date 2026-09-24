'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { useAuth } from '@/context/AuthContext';
import { fetchAttempts, fetchTests } from '@/lib/db';
import { Test, TestAttempt } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Award,
  CheckCircle2,
  Clock,
  Code2,
  TrendingUp,
  FileCheck,
  ShieldCheck,
  ArrowRight,
  RotateCcw,
  Loader2,
  FileX,
} from 'lucide-react';

export default function TestResultPage() {
  const params = useParams();
  const { user } = useAuth();

  const testId = typeof params?.id === 'string' ? params.id : '';

  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<Test | null>(null);
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [tests, attempts] = await Promise.all([fetchTests(), fetchAttempts()]);

        const currentTest = tests.find((t) => t.id === testId) || tests[0] || null;
        setTest(currentTest);

        // Find candidate's attempt
        const userAttempt = attempts.find(
          (a) =>
            a.test_id === testId &&
            (a.student_id === user?.id ||
              a.students?.register_number === user?.register_number ||
              a.id.includes(user?.register_number || ''))
        ) || attempts.find((a) => a.test_id === testId) || null;

        setAttempt(userAttempt);

        if (userAttempt) {
          try {
            confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.6 },
            });
          } catch {
            // safe fallback
          }
        }
      } catch (err) {
        console.error('Failed to load result:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [testId, user?.id, user?.register_number]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!attempt && !test) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <EmptyState
          icon={FileX}
          title="No assessment results available"
          description="No completed evaluation records were found for this assessment session."
          actionText="Return to Student Dashboard"
          actionHref="/student/dashboard"
        />
      </div>
    );
  }

  const totalScore = attempt?.score ?? 0;
  const maxMarks = test?.total_marks || 100;
  const percentage = attempt?.percentage ?? Math.round((totalScore / maxMarks) * 100);
  const timeTakenMinutes = Math.floor((attempt?.time_taken_seconds || 0) / 60);
  const timeTakenSeconds = (attempt?.time_taken_seconds || 0) % 60;
  const timeTakenFormatted = `${timeTakenMinutes}m ${timeTakenSeconds}s`;
  const completionRank = attempt?.completion_rank || 1;
  const questionsList = test?.questions?.map((tq) => tq.question!).filter(Boolean) || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
      {/* Top Completion Celebration Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border border-emerald-500/40 rounded-3xl p-8 text-center relative overflow-hidden shadow-2xl">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-4">
          <CheckCircle2 className="w-4 h-4" />
          <span>ASSESSMENT COMPLETED & EVALUATED</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
          Assessment Report & Scorecard
        </h1>
        <p className="text-slate-300 text-sm max-w-xl mx-auto mb-6">
          Congratulations {user?.full_name || 'Candidate'} ({user?.register_number || 'Registered Candidate'})! Your responses were evaluated server-side by the JIT CodeArena scoring engine.
        </p>

        {/* First Completion Rank Pill */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm font-bold shadow-lg">
          <Award className="w-5 h-5 text-amber-400" />
          <span>Finish Order: Rank #{completionRank} to Complete</span>
        </div>
      </div>

      {/* KPI Results Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">Final Score</span>
          <div className="text-2xl font-black text-emerald-400">{totalScore.toFixed(1)}</div>
          <span className="text-[10px] text-slate-500">out of {maxMarks}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">Percentage</span>
          <div className="text-2xl font-black text-white">{percentage}%</div>
          <span className="text-[10px] text-emerald-400">
            {percentage >= 90 ? 'Grade: O (Outstanding)' : percentage >= 75 ? 'Grade: A+ (Excellent)' : percentage >= 50 ? 'Grade: B (Satisfactory)' : 'Requires Review'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">Time Taken</span>
          <div className="text-xl font-bold text-white mt-1">{timeTakenFormatted}</div>
          <span className="text-[10px] text-slate-500">of {test?.duration_minutes || 60}m allotted</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">Status</span>
          <div className="text-xl font-bold text-indigo-400 capitalize mt-1">
            {attempt?.status?.replace('_', ' ') || 'Submitted'}
          </div>
          <span className="text-[10px] text-slate-500">Official Evaluation</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">Tab Deviations</span>
          <div className="text-2xl font-black text-blue-400">{attempt?.tab_switch_count || 0}</div>
          <span className="text-[10px] text-slate-500">Browser switches</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">Violations</span>
          <div className="text-2xl font-black text-purple-400">{attempt?.fullscreen_exit_count || 0}</div>
          <span className="text-[10px] text-slate-500">Fullscreen departures</span>
        </div>
      </div>

      {/* Question-Wise Performance Breakdown */}
      {questionsList.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-indigo-400" />
              <span>Assessment Questions</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">Scoring Model: Server-Side Unit Tests</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-4">Question Title</th>
                  <th className="py-3 px-3">Topic</th>
                  <th className="py-3 px-3">Difficulty</th>
                  <th className="py-3 px-4 text-right">Max Marks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {questionsList.map((q, idx) => (
                  <tr key={q.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 text-slate-500 font-bold">{idx + 1}</td>
                    <td className="py-3 px-4 font-sans font-semibold text-white">
                      <span>{q.title}</span>
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-300">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                        {q.topic}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-sans capitalize text-slate-300">
                      {q.difficulty}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400">
                      {q.marks} Marks
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Security & Integrity Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              Integrity Verification: {attempt?.tab_switch_count === 0 && attempt?.fullscreen_exit_count === 0 ? 'Clean Session' : 'Incident Telemetry Recorded'}
            </h4>
            <p className="text-xs text-slate-400">
              {attempt?.tab_switch_count || 0} Tab Switches • {attempt?.fullscreen_exit_count || 0} Fullscreen Violations • {attempt?.copy_paste_count || 0} Blocked Clipboard Events
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/student/dashboard"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
          >
            <span>Return to Student Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
