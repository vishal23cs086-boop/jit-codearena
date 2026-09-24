'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { MOCK_TESTS } from '@/lib/mockData';
import { exportToCsv } from '@/lib/utils';
import {
  Award,
  Clock,
  ArrowUpDown,
  Download,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

interface CompletionRow {
  completionOrder: number;
  rankByScore: number;
  studentName: string;
  registerNumber: string;
  department: string;
  year: number;
  completedAt: string;
  timeTakenSeconds: number;
  timeTakenDisplay: string;
  score: number;
  percentage: number;
  tabSwitches: number;
}

const INITIAL_ROWS: CompletionRow[] = [
  {
    completionOrder: 1,
    rankByScore: 1,
    studentName: 'Harish Kumar S',
    registerNumber: '22CS084',
    department: 'CSE',
    year: 3,
    completedAt: '10:36:12 AM',
    timeTakenSeconds: 2040,
    timeTakenDisplay: '34m 00s',
    score: 96.5,
    percentage: 96.5,
    tabSwitches: 0,
  },
  {
    completionOrder: 2,
    rankByScore: 2,
    studentName: 'Ananya Meenakshi',
    registerNumber: '23EC031',
    department: 'ECE',
    year: 2,
    completedAt: '10:39:20 AM',
    timeTakenSeconds: 2280,
    timeTakenDisplay: '38m 00s',
    score: 92.0,
    percentage: 92.0,
    tabSwitches: 0,
  },
  {
    completionOrder: 3,
    rankByScore: 3,
    studentName: 'Priya Sundaram',
    registerNumber: '23IT045',
    department: 'IT',
    year: 2,
    completedAt: '10:44:05 AM',
    timeTakenSeconds: 2345,
    timeTakenDisplay: '39m 05s',
    score: 72.0,
    percentage: 72.0,
    tabSwitches: 1,
  },
];

type SortMode = 'completion' | 'score' | 'time' | 'name';

export default function FirstCompletionTrackingPage() {
  const params = useParams();
  const testId = typeof params?.testId === 'string' ? params.testId : 'test-jit-py-2026';
  const test = MOCK_TESTS.find((t) => t.id === testId) || MOCK_TESTS[0];

  const [sortMode, setSortMode] = useState<SortMode>('completion');

  const sortedRows = [...INITIAL_ROWS].sort((a, b) => {
    switch (sortMode) {
      case 'completion':
        return a.completionOrder - b.completionOrder;
      case 'score':
        return b.score - a.score;
      case 'time':
        return a.timeTakenSeconds - b.timeTakenSeconds;
      case 'name':
        return a.studentName.localeCompare(b.studentName);
      default:
        return 0;
    }
  });

  const handleExportCSV = () => {
    const csvData = sortedRows.map((r) => ({
      'Completion Order': `${r.completionOrder}${r.completionOrder === 1 ? 'st' : r.completionOrder === 2 ? 'nd' : 'rd'}`,
      'Score Rank': `#${r.rankByScore}`,
      'Student Name': r.studentName,
      'Register Number': r.registerNumber,
      Department: r.department,
      Year: r.year,
      'Server Completed At': r.completedAt,
      'Time Taken': r.timeTakenDisplay,
      'Final Score': r.score,
      Percentage: `${r.percentage}%`,
      'Tab Switches': r.tabSwitches,
    }));
    exportToCsv(`JIT_Completion_Leaderboard_${test.id}`, csvData);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-bold text-white">First Completion Tracking & Ranking</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Official server-recorded completion timestamps for {test.title}
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-md shadow-emerald-600/20"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Leaderboard CSV</span>
        </button>
      </div>

      {/* Distinction notice mandated in prompt */}
      <div className="p-3.5 bg-indigo-950/30 border border-indigo-500/30 rounded-xl text-xs text-indigo-200 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong>Server-Side First-Completion Audit:</strong> Completion order reflects the precise millisecond timestamp when the candidate finalized their test. Score rank reflects total points accumulated across all algorithmic test cases.
        </div>
      </div>

      {/* Sorting Tabs Bar */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-2.5 rounded-2xl">
        <span className="text-xs text-slate-400 font-medium pl-2">Sort Leaderboard by:</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSortMode('completion')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              sortMode === 'completion'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-950/60 text-slate-400 hover:bg-slate-800'
            }`}
          >
            1. Completion Order (1st, 2nd...)
          </button>
          <button
            onClick={() => setSortMode('score')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              sortMode === 'score'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-950/60 text-slate-400 hover:bg-slate-800'
            }`}
          >
            2. Highest Score
          </button>
          <button
            onClick={() => setSortMode('time')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              sortMode === 'time'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-950/60 text-slate-400 hover:bg-slate-800'
            }`}
          >
            3. Fastest Completion Time
          </button>
          <button
            onClick={() => setSortMode('name')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              sortMode === 'name'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-950/60 text-slate-400 hover:bg-slate-800'
            }`}
          >
            4. Student Name
          </button>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4 text-center">Completion Order</th>
                <th className="py-3.5 px-3 text-center">Score Rank</th>
                <th className="py-3.5 px-4">Student Name</th>
                <th className="py-3.5 px-3">Reg Number</th>
                <th className="py-3.5 px-3">Department</th>
                <th className="py-3.5 px-3 text-center">Completed At</th>
                <th className="py-3.5 px-3 text-center">Time Taken</th>
                <th className="py-3.5 px-4 text-right">Final Marks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {sortedRows.map((row) => (
                <tr key={row.registerNumber} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        row.completionOrder === 1
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : row.completionOrder === 2
                          ? 'bg-slate-300/20 text-slate-200 border border-slate-400/30'
                          : 'bg-indigo-950/50 text-indigo-300 border border-indigo-800'
                      }`}
                    >
                      {row.completionOrder === 1 ? '🥇 1st' : row.completionOrder === 2 ? '🥈 2nd' : '🥉 3rd'} to Finish
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-center text-slate-300 font-bold">
                    #{row.rankByScore}
                  </td>
                  <td className="py-3.5 px-4 font-sans font-semibold text-white">
                    {row.studentName}
                  </td>
                  <td className="py-3.5 px-3 text-slate-300">{row.registerNumber}</td>
                  <td className="py-3.5 px-3 font-sans text-slate-400">
                    {row.department} (Yr {row.year})
                  </td>
                  <td className="py-3.5 px-3 text-center text-slate-300">{row.completedAt}</td>
                  <td className="py-3.5 px-3 text-center text-slate-300">{row.timeTakenDisplay}</td>
                  <td className="py-3.5 px-4 text-right text-sm font-bold text-emerald-400">
                    {row.score} / {test.total_marks}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
