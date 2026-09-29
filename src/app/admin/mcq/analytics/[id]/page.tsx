'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  Award,
  Clock,
  TrendingUp,
  Users,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronLeft,
  Loader2,
  FileText,
  Search,
  ArrowUpDown,
  X,
  Sparkles,
} from 'lucide-react';

interface AnalyticsData {
  test: {
    id: string;
    title: string;
    code: string;
    year: number;
    total_marks: number;
    duration: number;
  };
  summary: {
    total_students_started: number;
    completed_count: number;
    in_progress_count: number;
    average_score: number;
    highest_score: number;
    lowest_score: number;
    average_time_seconds: number;
  };
  leaderboard: Array<{
    rank: number;
    student_id: string;
    register_number: string;
    full_name: string;
    department: string;
    score: number;
    max_score: number;
    percentage: number;
    time_taken_seconds: number;
    status: string;
    completed_at: string | null;
  }>;
  question_stats: Array<{
    question_number: number;
    question_id: string;
    question_text: string;
    total_attempts: number;
    correct: number;
    incorrect: number;
    unanswered: number;
    accuracy_percentage: number;
  }>;
}

export default function McqAssessmentAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const testId = resolvedParams.id;

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentDrilldown, setStudentDrilldown] = useState<any | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [testId]);

  async function loadAnalytics() {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/mcq/assessments/${testId}/analytics`);
      const resData = await res.json();
      if (res.ok && resData.success) {
        setData(resData);
      }
    } catch (err) {
      console.error('Failed to load assessment analytics:', err);
    } finally {
      setLoading(false);
    }
  }

  const openStudentDrilldown = async (studentId: string) => {
    setSelectedStudentId(studentId);
    setDrilldownLoading(true);
    try {
      const res = await fetch(`/api/admin/mcq/assessments/${testId}/student/${studentId}`);
      const drillData = await res.json();
      if (res.ok && drillData.success) {
        setStudentDrilldown(drillData);
      }
    } catch (err) {
      console.error('Failed to load drilldown:', err);
    } finally {
      setDrilldownLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  if (loading || !data) {
    return (
      <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-xs max-w-4xl mx-auto my-12">
        <Loader2 className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-900">Loading Assessment Analytics...</p>
        <p className="text-xs text-slate-500 mt-1">Aggregating student submissions and question accuracy.</p>
      </div>
    );
  }

  const filteredLeaderboard = data.leaderboard.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.register_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/tests"
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{data.test.title}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                MCQ Assessment
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Year {data.test.year}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Code: <span className="font-mono font-bold text-slate-700">{data.test.code}</span> • Total Marks: {data.test.total_marks} • Duration: {data.test.duration}m
            </p>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Candidates</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {data.summary.completed_count} <span className="text-xs text-slate-400 font-normal">/ {data.summary.total_students_started} started</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Average Score</div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-0.5">
              {data.summary.average_score} <span className="text-xs text-slate-400 font-normal">/ {data.test.total_marks}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">High / Low Score</div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">
              {data.summary.highest_score} <span className="text-xs text-slate-400 font-normal">/ {data.summary.lowest_score}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Average Time</div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">
              {formatDuration(data.summary.average_time_seconds)}
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600" />
              <span>Ranked Leaderboard</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Server-calculated rankings: Highest score first, then earliest completion timestamp.
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name or roll..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs pl-9 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-indigo-600 w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pl-3">Rank</th>
                <th className="pb-3">Candidate</th>
                <th className="pb-3">Register No</th>
                <th className="pb-3">Department</th>
                <th className="pb-3">Score</th>
                <th className="pb-3">Percentage</th>
                <th className="pb-3">Time Taken</th>
                <th className="pb-3 pr-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeaderboard.length > 0 ? (
                filteredLeaderboard.map((student) => (
                  <tr key={student.student_id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 pl-3">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                          student.rank === 1
                            ? 'bg-amber-100 text-amber-800'
                            : student.rank === 2
                            ? 'bg-slate-200 text-slate-800'
                            : student.rank === 3
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'text-slate-500 font-mono'
                        }`}
                      >
                        {student.rank}
                      </span>
                    </td>
                    <td className="py-3.5 font-bold text-slate-900">{student.full_name}</td>
                    <td className="py-3.5 font-mono text-slate-600">{student.register_number}</td>
                    <td className="py-3.5 text-slate-600">{student.department}</td>
                    <td className="py-3.5">
                      <span className="font-extrabold text-indigo-700">
                        {student.score} / {student.max_score}
                      </span>
                    </td>
                    <td className="py-3.5 font-semibold text-slate-700">{student.percentage}%</td>
                    <td className="py-3.5 font-mono text-slate-500">{formatDuration(student.time_taken_seconds)}</td>
                    <td className="py-3.5 pr-3 text-right">
                      <button
                        onClick={() => openStudentDrilldown(student.student_id)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs transition"
                      >
                        View Drill-Down
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No completed student records found matching search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Question-Wise Performance Analytics Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Question-Wise Difficulty & Accuracy Analysis</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Identify questions with high failure rates or low accuracy across the cohort.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pl-3">Q#</th>
                <th className="pb-3">Question Text</th>
                <th className="pb-3">Attempts</th>
                <th className="pb-3 text-emerald-700">Correct</th>
                <th className="pb-3 text-rose-700">Incorrect</th>
                <th className="pb-3">Accuracy</th>
                <th className="pb-3 pr-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.question_stats.map((q) => {
                const isChallenging = q.accuracy_percentage < 50 && q.total_attempts > 0;
                return (
                  <tr key={q.question_id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 pl-3 font-mono font-bold text-slate-700">{q.question_number}</td>
                    <td className="py-3 font-medium text-slate-800 max-w-md truncate" title={q.question_text}>
                      {q.question_text}
                    </td>
                    <td className="py-3 font-mono text-slate-600">{q.total_attempts}</td>
                    <td className="py-3 font-bold text-emerald-600">{q.correct}</td>
                    <td className="py-3 font-bold text-rose-600">{q.incorrect}</td>
                    <td className="py-3 font-bold">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              q.accuracy_percentage >= 70
                                ? 'bg-emerald-500'
                                : q.accuracy_percentage >= 40
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${q.accuracy_percentage}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-slate-700">{q.accuracy_percentage}%</span>
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      {isChallenging ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Challenging
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          Normal
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual Student Drill-Down Modal */}
      {selectedStudentId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-3xl w-full border border-slate-200 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Candidate Assessment Drill-Down
                </h3>
                {studentDrilldown && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {studentDrilldown.student.full_name} ({studentDrilldown.student.register_number}) • Year{' '}
                    {studentDrilldown.student.year} • Score:{' '}
                    <strong className="text-indigo-700">
                      {studentDrilldown.attempt.score} / {studentDrilldown.assessment.total_marks} (
                      {studentDrilldown.attempt.percentage}%)
                    </strong>
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedStudentId(null);
                  setStudentDrilldown(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto py-4 space-y-3 flex-1">
              {drilldownLoading ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Loading student answer breakdown...</p>
                </div>
              ) : studentDrilldown?.questions ? (
                studentDrilldown.questions.map((q: any) => (
                  <div
                    key={q.question_id}
                    className={`p-4 rounded-2xl border text-xs space-y-2 ${
                      q.is_correct
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : q.selected_option
                        ? 'border-rose-200 bg-rose-50/20'
                        : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Question {q.question_number}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          q.is_correct
                            ? 'bg-emerald-100 text-emerald-800'
                            : q.selected_option
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {q.is_correct ? '✓ Correct (+2)' : q.selected_option ? '✗ Incorrect (0)' : 'Unanswered (0)'}
                      </span>
                    </div>

                    <p className="font-semibold text-slate-900">{q.question_text}</p>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div>
                        Selected Choice:{' '}
                        <strong className={q.is_correct ? 'text-emerald-700' : 'text-rose-700'}>
                          Option {q.selected_option || 'None'}
                        </strong>
                      </div>
                      <div>
                        Correct Answer:{' '}
                        <strong className="text-emerald-700">Option {q.correct_answer}</strong>
                      </div>
                    </div>
                  </div>
                ))
              ) : null}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => {
                  setSelectedStudentId(null);
                  setStudentDrilldown(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
              >
                Close Drill-Down
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
