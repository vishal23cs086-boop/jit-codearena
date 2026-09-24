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
      <div className="glass-card rounded-3xl p-8 sm:p-10 text-center relative overflow-hidden shadow-sm border border-slate-200/90 bg-white">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-100/50 blur-[120px] pointer-events-none rounded-full" />
        <div className="flex justify-center mb-5 relative z-10">
          <div className="w-20 h-20 p-2 bg-slate-50 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-center">
            <img
              src="/jit-logo.png"
              alt="Jansons Institute of Technology Crest"
              className="w-full h-full object-contain filter drop-shadow-sm"
            />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-3 shadow-xs relative z-10">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>JANSONS INSTITUTE OF TECHNOLOGY • OFFICIAL EVALUATION SCORECARD</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-2 relative z-10">
          Assessment Report & Scorecard
        </h1>
        <p className="text-slate-600 text-sm max-w-xl mx-auto mb-6 relative z-10">
          Congratulations {user?.full_name || 'Candidate'} ({user?.register_number || 'Registered Candidate'})! Your responses were evaluated server-side by the JIT CodeArena scoring engine.
        </p>

        {/* First Completion Rank Pill */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-bold shadow-xs relative z-10">
          <Award className="w-5 h-5 text-amber-600" />
          <span>Finish Order: Rank #{completionRank} to Complete</span>
        </div>
      </div>

      {/* KPI Results Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="glass-card-hover rounded-2xl p-4 text-center border border-slate-200/90 bg-white">
          <span className="text-[11px] text-slate-500 font-medium block mb-1">Final Score</span>
          <div className="text-2xl font-black text-emerald-600">{totalScore.toFixed(1)}</div>
          <span className="text-[10px] text-slate-400">out of {maxMarks}</span>
        </div>

        <div className="glass-card-hover rounded-2xl p-4 text-center border border-slate-200/90 bg-white">
          <span className="text-[11px] text-slate-500 font-medium block mb-1">Percentage</span>
          <div className="text-2xl font-black text-slate-900">{percentage}%</div>
          <span className="text-[10px] text-emerald-600 font-medium">
            {percentage >= 90 ? 'Grade: O (Outstanding)' : percentage >= 75 ? 'Grade: A+ (Excellent)' : percentage >= 50 ? 'Grade: B (Satisfactory)' : 'Requires Review'}
          </span>
        </div>

        <div className="glass-card-hover rounded-2xl p-4 text-center border border-slate-200/90 bg-white">
          <span className="text-[11px] text-slate-500 font-medium block mb-1">Time Taken</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{timeTakenFormatted}</div>
          <span className="text-[10px] text-slate-400">of {test?.duration_minutes || 60}m allotted</span>
        </div>

        <div className="glass-card-hover rounded-2xl p-4 text-center border border-slate-200/90 bg-white">
          <span className="text-[11px] text-slate-500 font-medium block mb-1">Status</span>
          <div className="text-xl font-bold text-indigo-600 capitalize mt-1">
            {attempt?.status?.replace('_', ' ') || 'Submitted'}
          </div>
          <span className="text-[10px] text-slate-400">Official Evaluation</span>
        </div>

        <div className="glass-card-hover rounded-2xl p-4 text-center border border-slate-200/90 bg-white">
          <span className="text-[11px] text-slate-500 font-medium block mb-1">Tab Deviations</span>
          <div className="text-2xl font-black text-cyan-600">{attempt?.tab_switch_count || 0}</div>
          <span className="text-[10px] text-slate-400">Browser switches</span>
        </div>

        <div className="glass-card-hover rounded-2xl p-4 text-center border border-slate-200/90 bg-white">
          <span className="text-[11px] text-slate-500 font-medium block mb-1">Violations</span>
          <div className="text-2xl font-black text-purple-600">{attempt?.fullscreen_exit_count || 0}</div>
          <span className="text-[10px] text-slate-400">Fullscreen departures</span>
        </div>
      </div>

      {/* Question-Wise Performance Breakdown */}
      {questionsList.length > 0 && (
        <div className="glass-card rounded-3xl p-6 sm:p-7 space-y-4 shadow-sm border border-slate-200/90 bg-white">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-indigo-600" />
              <span>Assessment Questions</span>
            </h2>
            <span className="text-xs text-slate-500 font-mono">Scoring Model: Server-Side Unit Tests</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider bg-slate-50">
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-4">Question Title</th>
                  <th className="py-3 px-3">Topic</th>
                  <th className="py-3 px-3">Difficulty</th>
                  <th className="py-3 px-4 text-right">Max Marks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {questionsList.map((q, idx) => (
                  <tr key={q.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 text-slate-400 font-bold">{idx + 1}</td>
                    <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                      <span>{q.title}</span>
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-600">
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {q.topic}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-sans capitalize text-slate-600">
                      {q.difficulty}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600">
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
      <div className="glass-card rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm border border-slate-200/90 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Integrity Verification: {attempt?.tab_switch_count === 0 && attempt?.fullscreen_exit_count === 0 ? 'Clean Session' : 'Incident Telemetry Recorded'}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {attempt?.tab_switch_count || 0} Tab Switches • {attempt?.fullscreen_exit_count || 0} Fullscreen Violations • {attempt?.copy_paste_count || 0} Blocked Clipboard Events
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/student/dashboard"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
          >
            <span>Return to Student Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
