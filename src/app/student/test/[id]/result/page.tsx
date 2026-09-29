'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { useAuth } from '@/context/AuthContext';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Award,
  CheckCircle2,
  Clock,
  TrendingUp,
  FileCheck,
  ShieldCheck,
  ArrowRight,
  Loader2,
  FileX,
  XCircle,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';

interface QuestionResultItem {
  question_id: string;
  question_order: number;
  title?: string;
  question_text?: string;
  topic?: string;
  difficulty?: string;
  marks?: number;
  max_marks?: number;
  score?: number;
  marks_awarded?: number;
  status?: string;
  passed_test_cases?: number;
  total_test_cases?: number;
  is_passed?: boolean;
  selected_option?: string | null;
  correct_answer?: string;
  is_correct?: boolean;
}

interface AssessmentResultData {
  attempt_id: string;
  test_id: string;
  test_title: string;
  test_type?: 'coding' | 'mcq' | string;
  student_id: string;
  register_number: string;
  full_name: string;
  department: string;
  student_year: number;
  score: number;
  total_marks: number;
  passing_marks: number;
  is_passed: boolean;
  percentage: number;
  time_taken_seconds: number;
  status: string;
  is_completed: boolean;
  started_at: string;
  completed_at: string | null;
  completion_rank: number;
  tab_switch_count: number;
  fullscreen_exit_count: number;
  copy_paste_count: number;
  questions: QuestionResultItem[];
}

export default function TestResultPage() {
  const params = useParams();
  const { user } = useAuth();

  const testId = typeof params?.id === 'string' ? params.id : '';

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<AssessmentResultData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadAuthoritativeResult() {
      if (!testId) return;
      setLoading(true);
      setErrorMessage(null);

      try {
        const res = await fetch(`/api/student/assessments/${testId}/result`);
        const data = await res.json();

        if (res.ok && data.success && data.result) {
          setResult(data.result);
          if (data.result.is_passed) {
            try {
              confetti({
                particleCount: 80,
                spread: 60,
                origin: { y: 0.6 },
              });
            } catch {}
          }
        } else {
          setErrorMessage(data.error || 'No evaluation results found for this assessment.');
        }
      } catch (err) {
        console.error('Failed to load result:', err);
        setErrorMessage('Failed to connect to evaluation database.');
      } finally {
        setLoading(false);
      }
    }

    loadAuthoritativeResult();
  }, [testId, user?.id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs text-slate-500">Retrieving official assessment scorecard...</p>
      </div>
    );
  }

  if (!result || errorMessage) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <EmptyState
          icon={FileX}
          title="No assessment results available"
          description={errorMessage || 'No completed evaluation records were found for this assessment session.'}
          actionText="Return to Student Dashboard"
          actionHref="/student/dashboard"
        />
      </div>
    );
  }

  const timeTakenMinutes = Math.floor((result.time_taken_seconds || 0) / 60);
  const timeTakenSeconds = (result.time_taken_seconds || 0) % 60;
  const timeTakenFormatted = `${timeTakenMinutes}m ${timeTakenSeconds}s`;

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

        {result.status === 'terminated' ? (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-50 border border-rose-300 text-rose-800 text-xs font-black mb-3 shadow-xs relative z-10">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>ATTEMPT TERMINATED BY PROCTORING SYSTEM</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-3 shadow-xs relative z-10">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>JANSONS INSTITUTE OF TECHNOLOGY • OFFICIAL EVALUATION SCORECARD</span>
          </div>
        )}

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-2 relative z-10">
          Assessment Report & Scorecard
        </h1>
        <p className="text-slate-600 text-sm max-w-xl mx-auto mb-4 relative z-10">
          Candidate: <span className="font-semibold text-slate-900">{result.full_name}</span> (
          <span className="font-mono text-slate-800 font-bold">{result.register_number}</span>) • {result.department} Year {result.student_year}
        </p>

        {result.status === 'terminated' && (
          <div className="max-w-2xl mx-auto my-4 p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-left text-xs space-y-1 relative z-10 shadow-xs">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
              <span>STATUS: TERMINATED</span>
            </div>
            <p className="text-rose-800 font-medium">
              <strong>Cause:</strong> Excessive proctoring violations recorded (violation_count &gt; 3)
            </p>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              This assessment attempt was terminated due to repeated security and proctoring policy breaches. Your test attempt has been locked and recorded to the administrative disciplinary audit stream.
            </p>
          </div>
        )}

        {/* Completion Rank Pill */}
        {result.status === 'terminated' ? (
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold shadow-xs relative z-10">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <span>Status: Disqualified (Terminated)</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-bold shadow-xs relative z-10">
            <Award className="w-5 h-5 text-amber-600" />
            <span>Finish Order: Rank #{result.completion_rank} to Complete</span>
          </div>
        )}
      </div>

      {/* KPI Results Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="glass-card-hover rounded-2xl p-4 text-center border border-slate-200/90 bg-white">
          <span className="text-[11px] text-slate-500 font-medium block mb-1">Final Score</span>
          <div className={`text-2xl font-black ${result.status === 'terminated' ? 'text-rose-600' : 'text-emerald-600'}`}>
            {result.score.toFixed(1)}
          </div>
          <span className="text-[10px] text-slate-400">out of {result.total_marks}</span>
        </div>

        <div className="glass-card-hover rounded-2xl p-4 text-center border border-slate-200/90 bg-white">
          <span className="text-[11px] text-slate-500 font-medium block mb-1">Percentage</span>
          <div className="text-2xl font-black text-slate-900">{result.percentage}%</div>
          {result.status === 'terminated' ? (
            <span className="text-[10px] font-bold text-rose-700">Status: TERMINATED</span>
          ) : (
            <span className={`text-[10px] font-bold ${result.is_passed ? 'text-emerald-600' : 'text-rose-600'}`}>
              {result.is_passed ? 'Status: PASSED' : 'Status: FAILED'}
            </span>
          )}
        </div>

        <div className="glass-card-hover rounded-2xl p-4 text-center border border-slate-200/90 bg-white">
          <span className="text-[11px] text-slate-500 font-medium block mb-1">Time Taken</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{timeTakenFormatted}</div>
          <span className="text-[10px] text-slate-400">Server Evaluated</span>
        </div>

        <div className="glass-card-hover rounded-2xl p-4 text-center border border-slate-200/90 bg-white">
          <span className="text-[11px] text-slate-500 font-medium block mb-1">Evaluation</span>
          <div className={`text-xl font-bold capitalize mt-1 ${result.status === 'terminated' ? 'text-rose-700' : (result.is_passed ? 'text-emerald-600' : 'text-rose-600')}`}>
            {result.status === 'terminated' ? 'Terminated' : (result.is_passed ? 'Passed' : 'Not Passed')}
          </div>
          <span className="text-[10px] text-slate-400">Pass Mark: {result.passing_marks}</span>
        </div>

        <div className="glass-card-hover rounded-2xl p-4 text-center border border-slate-200/90 bg-white">
          <span className="text-[11px] text-slate-500 font-medium block mb-1">Tab Deviations</span>
          <div className="text-2xl font-black text-cyan-600">{result.tab_switch_count || 0}</div>
          <span className="text-[10px] text-slate-400">Browser switches</span>
        </div>

        <div className="glass-card-hover rounded-2xl p-4 text-center border border-slate-200/90 bg-white">
          <span className="text-[11px] text-slate-500 font-medium block mb-1">Violations</span>
          <div className="text-2xl font-black text-purple-600">{result.fullscreen_exit_count || 0}</div>
          <span className="text-[10px] text-slate-400">Fullscreen departures</span>
        </div>
      </div>

      {/* Question-Wise Performance Breakdown */}
      {result.questions && result.questions.length > 0 && (
        <div className="glass-card rounded-3xl p-6 sm:p-7 space-y-4 shadow-sm border border-slate-200/90 bg-white">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-indigo-600" />
              <span>Question-Level Performance Breakdown</span>
            </h2>
            <span className="text-xs text-slate-500 font-mono">Authoritative Turso Submissions</span>
          </div>

          <div className="overflow-x-auto">
            {result.test_type === 'mcq' ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider bg-slate-50">
                    <th className="py-3 px-3">#</th>
                    <th className="py-3 px-4">Question Statement</th>
                    <th className="py-3 px-3 text-center">Your Response</th>
                    <th className="py-3 px-3 text-center">Correct Key</th>
                    <th className="py-3 px-3 text-center">Result</th>
                    <th className="py-3 px-4 text-right">Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {result.questions.map((q, idx) => {
                    const studentAns = q.selected_option;
                    const correctAns = q.correct_answer;
                    const isCorrect = q.is_correct ?? (Boolean(studentAns) && studentAns === correctAns);
                    const qMarks = q.max_marks ?? q.marks ?? 2;
                    const earned = q.marks_awarded ?? (isCorrect ? qMarks : 0);

                    return (
                      <tr key={q.question_id || idx} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3 text-slate-400 font-bold">{q.question_order || idx + 1}</td>
                        <td className="py-3 px-4 font-sans font-medium text-slate-900 max-w-md">
                          <p className="line-clamp-2">{q.question_text || q.title}</p>
                        </td>
                        <td className="py-3 px-3 text-center font-bold font-mono">
                          {studentAns ? (
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs">
                              Option {studentAns}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] font-normal font-sans">Unanswered</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-bold font-mono">
                          {correctAns ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">
                              Option {correctAns}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-sans">
                          {!studentAns ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                              Unattempted
                            </span>
                          ) : isCorrect ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Correct
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-semibold border border-rose-200">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              Incorrect
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold font-mono text-xs">
                          <span className={earned > 0 ? 'text-emerald-600' : 'text-slate-400'}>
                            {earned}
                          </span>{' '}
                          <span className="text-slate-400 font-normal">/ {qMarks}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider bg-slate-50">
                    <th className="py-3 px-3">#</th>
                    <th className="py-3 px-4">Question Title</th>
                    <th className="py-3 px-3">Topic</th>
                    <th className="py-3 px-3">Difficulty</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Score Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {result.questions.map((q, idx) => {
                    const isAccepted = q.status === 'Accepted' || q.status === 'SUCCESS' || (q.score ?? 0) > 0;
                    return (
                      <tr key={q.question_id || idx} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3 text-slate-400 font-bold">{q.question_order || idx + 1}</td>
                        <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                          <span>{q.title || q.question_text}</span>
                        </td>
                        <td className="py-3 px-3 font-sans text-slate-600">
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {q.topic || 'Algorithms'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-sans capitalize text-slate-600">
                          {q.difficulty || 'Easy'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {q.status === 'Unattempted' ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold border border-slate-200">
                                Unattempted
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">0 / 3 tests</span>
                            </div>
                          ) : isAccepted ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Passed
                              </span>
                              <span className="text-[10px] font-mono text-emerald-600 font-semibold">
                                Passed: {q.passed_test_cases ?? 3} / {q.total_test_cases ?? 3}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-semibold border border-rose-200">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                {q.status || 'Failed'}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">
                                Passed: {q.passed_test_cases ?? 0} / {q.total_test_cases ?? 3}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold font-mono">
                          <span className={(q.score ?? 0) > 0 ? 'text-emerald-600' : 'text-slate-400'}>
                            {q.score ?? 0}
                          </span>{' '}
                          <span className="text-slate-400 font-normal">/ {q.marks ?? 25}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
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
              Integrity Verification: {result.tab_switch_count === 0 && result.fullscreen_exit_count === 0 ? 'Clean Session' : 'Incident Telemetry Recorded'}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {result.tab_switch_count || 0} Tab Switches • {result.fullscreen_exit_count || 0} Fullscreen Violations • {result.copy_paste_count || 0} Blocked Clipboard Events
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
