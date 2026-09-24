'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { useAuth } from '@/context/AuthContext';
import { MOCK_TESTS, MOCK_QUESTIONS } from '@/lib/mockData';
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
} from 'lucide-react';

export default function TestResultPage() {
  const params = useParams();
  const { user } = useAuth();

  const testId = typeof params?.id === 'string' ? params.id : 'test-jit-py-2026';
  const test = MOCK_TESTS.find((t) => t.id === testId) || MOCK_TESTS[0];

  useEffect(() => {
    // Fire celebratory confetti on mounting the result scorecard
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // safe fallback
    }
  }, []);

  const totalScore = 96.0;
  const percentage = 96.0;
  const timeTaken = '34m 12s';
  const solvedCount = 4;
  const totalQuestions = 4;
  const accuracy = '92.5%';
  const totalSubmissions = 5;
  const completionRank = 1; // 1st completed!

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
          Congratulations {user?.full_name || 'Candidate'} ({user?.register_number || '22CS084'})! Your responses were evaluated server-side by the JIT CodeArena scoring engine.
        </p>

        {/* First Completion Rank Pill */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm font-bold shadow-lg">
          <Award className="w-5 h-5 text-amber-400" />
          <span>Finish Order: {completionRank}st Candidate to Complete</span>
        </div>
      </div>

      {/* KPI Results Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">Final Score</span>
          <div className="text-2xl font-black text-emerald-400">{totalScore}</div>
          <span className="text-[10px] text-slate-500">out of {test.total_marks}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">Percentage</span>
          <div className="text-2xl font-black text-white">{percentage}%</div>
          <span className="text-[10px] text-emerald-400">Grade: O (Outstanding)</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">Time Taken</span>
          <div className="text-xl font-bold text-white mt-1">{timeTaken}</div>
          <span className="text-[10px] text-slate-500">of 60m allotted</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">Problems Solved</span>
          <div className="text-2xl font-black text-indigo-400">{solvedCount} / {totalQuestions}</div>
          <span className="text-[10px] text-slate-500">100% Solved</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">Accuracy</span>
          <div className="text-2xl font-black text-blue-400">{accuracy}</div>
          <span className="text-[10px] text-slate-500">High efficiency</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">Submissions</span>
          <div className="text-2xl font-black text-purple-400">{totalSubmissions}</div>
          <span className="text-[10px] text-slate-500">Total attempts</span>
        </div>
      </div>

      {/* Question-Wise Performance Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-indigo-400" />
            <span>Question-by-Question Evaluation</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">Scoring Model: Default Weighted</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3">#</th>
                <th className="py-3 px-4">Question Title</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-center">Test Cases</th>
                <th className="py-3 px-3 text-center">Attempts</th>
                <th className="py-3 px-3 text-center">Exec Time</th>
                <th className="py-3 px-4 text-right">Marks Scored</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {MOCK_QUESTIONS.map((q, idx) => (
                <tr key={q.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3 text-slate-500 font-bold">{idx + 1}</td>
                  <td className="py-3 px-4 font-sans font-semibold text-white">
                    <div className="flex items-center gap-2">
                      <span>{q.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-sans">
                        {q.topic}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-sans font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Accepted
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center text-slate-300">
                    {q.test_cases?.length || 5} / {q.test_cases?.length || 5} Passed
                  </td>
                  <td className="py-3 px-3 text-center text-slate-400">1</td>
                  <td className="py-3 px-3 text-center text-slate-300">38 ms</td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-400">
                    {q.marks}.00 / {q.marks}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security & Integrity Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Integrity Verification: Clean Session</h4>
            <p className="text-xs text-slate-400">
              0 Tab Switches • 0 Fullscreen Violations • 0 Unauthorized Clipboard Events
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
