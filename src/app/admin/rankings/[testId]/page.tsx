'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchTests, fetchAttempts, fetchStudents } from '@/lib/db';
import { Test, TestAttempt, StudentProfile } from '@/types';
import { exportToCsv } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Award,
  Clock,
  Download,
  AlertCircle,
  Trophy,
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

type SortMode = 'completion' | 'score' | 'time' | 'name';

export default function FirstCompletionTrackingPage() {
  const params = useParams();
  const testId = typeof params?.testId === 'string' ? params.testId : '';

  const [test, setTest] = useState<Test | null>(null);
  const [rows, setRows] = useState<CompletionRow[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>('completion');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [tests, attempts, students] = await Promise.all([
          fetchTests(),
          fetchAttempts(),
          fetchStudents(),
        ]);

        const targetTest = tests.find((t) => t.id === testId) || tests[0] || null;
        setTest(targetTest);

        if (targetTest) {
          const studentMap = new Map<string, StudentProfile>();
          students.forEach((s) => studentMap.set(s.id, s));

          // Filter completed attempts for this test
          const completedAttempts = attempts
            .filter(
              (a) =>
                a.test_id === targetTest.id &&
                (a.status === 'submitted' || a.status === 'auto_submitted') &&
                a.completed_at
            )
            .sort(
              (a, b) =>
                new Date(a.completed_at!).getTime() - new Date(b.completed_at!).getTime()
            );

          // Sort by score to compute score rank
          const byScore = [...completedAttempts].sort((a, b) => (b.score || 0) - (a.score || 0));
          const scoreRankMap = new Map<string, number>();
          byScore.forEach((a, idx) => scoreRankMap.set(a.id, idx + 1));

          const completionRows: CompletionRow[] = completedAttempts.map((att, idx) => {
            const student = studentMap.get(att.student_id);
            const timeTaken = att.time_taken_seconds || 0;
            const mins = Math.floor(timeTaken / 60);
            const secs = timeTaken % 60;

            return {
              completionOrder: att.completion_rank || idx + 1,
              rankByScore: scoreRankMap.get(att.id) || idx + 1,
              studentName: student?.full_name || student?.register_number || 'Candidate',
              registerNumber: student?.register_number || 'UNKNOWN',
              department: student?.department || 'CSE',
              year: student?.year || 2,
              completedAt: new Date(att.completed_at!).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }),
              timeTakenSeconds: timeTaken,
              timeTakenDisplay: `${mins}m ${secs.toString().padStart(2, '0')}s`,
              score: att.score || 0,
              percentage: att.percentage || 0,
              tabSwitches: att.tab_switch_count || 0,
            };
          });

          setRows(completionRows);
        }
      } catch (err) {
        console.warn('Error loading completion rankings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [testId]);

  const sortedRows = [...rows].sort((a, b) => {
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
      'Completion Order': `${r.completionOrder}`,
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
    exportToCsv(`JIT_Completion_Leaderboard_${test?.id || 'Assessment'}`, csvData);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Trophy className="w-7 h-7 text-amber-500" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">First Completion Tracking & Ranking</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Official server-recorded completion timestamps for {test?.title || 'Assessment'}
          </p>
        </div>

        {rows.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-sm shadow-emerald-600/20"
          >
            <Download className="w-4 h-4" />
            <span>Export Leaderboard CSV</span>
          </button>
        )}
      </div>

      {/* Distinction notice */}
      <div className="p-4 bg-indigo-50 border border-indigo-200/60 rounded-2xl text-xs text-indigo-800 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <strong className="text-indigo-950 font-bold">Server-Side First-Completion Audit:</strong> Completion order reflects the exact timestamp when the candidate submitted their assessment. Score rank reflects total marks scored across test cases.
        </div>
      </div>

      {/* Sorting Tabs Bar */}
      {rows.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/90 backdrop-blur-xl p-2 rounded-2xl border border-slate-200/90 shadow-sm shadow-slate-900/5">
          <span className="text-xs text-slate-500 font-medium pl-3">Sort Leaderboard by:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSortMode('completion')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                sortMode === 'completion'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs'
              }`}
            >
              1. Completion Order (1st, 2nd...)
            </button>
            <button
              onClick={() => setSortMode('score')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                sortMode === 'score'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs'
              }`}
            >
              2. Highest Score
            </button>
            <button
              onClick={() => setSortMode('time')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                sortMode === 'time'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs'
              }`}
            >
              3. Fastest Completion Time
            </button>
            <button
              onClick={() => setSortMode('name')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                sortMode === 'name'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs'
              }`}
            >
              4. Student Name
            </button>
          </div>
        </div>
      )}

      {/* Leaderboard Table or Empty State */}
      {sortedRows.length > 0 ? (
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm shadow-slate-900/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-4 px-4 text-center">Completion Order</th>
                  <th className="py-4 px-3 text-center">Score Rank</th>
                  <th className="py-4 px-4">Student Name</th>
                  <th className="py-4 px-3">Reg Number</th>
                  <th className="py-4 px-3">Department</th>
                  <th className="py-4 px-3 text-center">Completed At</th>
                  <th className="py-4 px-3 text-center">Time Taken</th>
                  <th className="py-4 px-4 text-right">Final Marks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {sortedRows.map((row) => (
                  <tr key={row.registerNumber} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold border ${
                          row.completionOrder === 1
                            ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-xs'
                            : row.completionOrder === 2
                            ? 'bg-slate-100 text-slate-700 border-slate-200'
                            : row.completionOrder === 3
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : 'bg-indigo-50/50 text-indigo-700 border-indigo-100'
                        }`}
                      >
                        #{row.completionOrder} to Finish
                      </span>
                    </td>
                    <td className="py-4 px-3 text-center text-slate-700 font-bold">
                      #{row.rankByScore}
                    </td>
                    <td className="py-4 px-4 font-sans font-semibold text-slate-900">
                      {row.studentName}
                    </td>
                    <td className="py-4 px-3 text-indigo-600 font-semibold">{row.registerNumber}</td>
                    <td className="py-4 px-3 font-sans text-slate-500">
                      {row.department} (Yr {row.year})
                    </td>
                    <td className="py-4 px-3 text-center text-slate-500">{row.completedAt}</td>
                    <td className="py-4 px-3 text-center text-slate-700 font-medium">{row.timeTakenDisplay}</td>
                    <td className="py-4 px-4 text-right text-sm font-bold text-emerald-600">
                      {row.score} pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No assessment results available yet"
          description="Candidates who finalize and submit this assessment will be ranked by exact finish timestamp here."
        />
      )}
    </div>
  );
}
