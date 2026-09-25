'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  Award,
  Clock,
  ShieldAlert,
  Code2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  User,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Props {
  attemptId: string | null;
  onClose: () => void;
}

export function CompletedAttemptModal({ attemptId, onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  useEffect(() => {
    if (!attemptId) {
      setData(null);
      return;
    }

    async function loadDetails() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/results/${attemptId}`);
        const json = await res.json();
        if (json.success && json.evaluation) {
          setData(json.evaluation);
          if (json.evaluation.questions?.length > 0) {
            setExpandedQuestion(json.evaluation.questions[0].question_id);
          }
        } else {
          setError(json.error || 'Failed to load assessment evaluation details.');
        }
      } catch (err: any) {
        setError(err?.message || 'Error fetching evaluation details.');
      } finally {
        setLoading(false);
      }
    }

    loadDetails();
  }, [attemptId]);

  if (!attemptId) return null;

  const att = data?.attempt;
  const student = data?.student;
  const test = data?.test;
  const questions = data?.questions || [];
  const security = data?.security;

  const formatTimeTaken = (secs: number) => {
    if (!secs || secs <= 0) return '0m 0s';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono font-bold text-[10px] uppercase">
                Official Examination Scorecard
              </span>
              <span className="font-mono text-xs text-slate-400">ID: {attemptId}</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-1">
              {test?.title || 'Assessment Evaluation Details'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 text-xs">
          {loading ? (
            <div className="py-24 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-500">Retrieving authoritative evaluation records from Turso...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700">
              {error}
            </div>
          ) : data ? (
            <>
              {/* Candidate & Test Metadata Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Candidate Info */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Candidate Information</span>
                  </span>
                  <div className="font-bold text-slate-900 text-base">{student?.full_name}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Register Number</span>
                      <span className="font-mono font-bold text-slate-800">{student?.register_number}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Department & Year</span>
                      <span className="font-semibold text-slate-800">{student?.department} • Year {student?.year}</span>
                    </div>
                  </div>
                </div>

                {/* Score & Standing */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border border-indigo-100 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Result Standing</span>
                  </span>
                  <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-black text-slate-900">
                      {att?.score} <span className="text-sm font-normal text-slate-400">/ {att?.max_score}</span>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full font-bold text-xs ${
                        att?.result_status === 'Passed'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {att?.result_status || 'Evaluated'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-indigo-100/60 font-mono">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Percentage</span>
                      <span className="font-bold text-indigo-700">{att?.percentage}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Time Taken</span>
                      <span className="font-bold text-slate-700">{formatTimeTaken(att?.time_taken_seconds)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Completion Rank</span>
                      <span className="font-bold text-purple-700">Rank #{att?.completion_rank}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assessment Timeline & Security Audit */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Started At</span>
                  <span className="font-mono text-slate-800">{new Date(att?.started_at).toLocaleTimeString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Completed At</span>
                  <span className="font-mono text-slate-800">{att?.completed_at ? new Date(att?.completed_at).toLocaleTimeString() : 'In Progress'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Proctoring Warnings</span>
                  <span className={`font-mono font-bold ${security?.warning_count > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {security?.warning_count ?? 0} / 3
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Tab Switches / Fullscreen</span>
                  <span className="font-mono text-slate-800">{security?.tab_switches} / {security?.fullscreen_exits}</span>
                </div>
              </div>

              {/* Question-by-Question Evaluation Breakdown */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                  <span>Question-Level Performance ({questions.length} Problems)</span>
                  <span className="text-xs text-slate-400 font-normal">Click problem to view submitted code</span>
                </h3>

                <div className="space-y-3">
                  {questions.map((q: any) => {
                    const isExpanded = expandedQuestion === q.question_id;
                    const isAccepted = q.status === 'Accepted' || (q.test_cases_passed > 0 && q.test_cases_passed === q.total_test_cases);

                    return (
                      <div
                        key={q.question_id}
                        className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs"
                      >
                        <div
                          onClick={() => setExpandedQuestion(isExpanded ? null : q.question_id)}
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                              isAccepted ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              Q{q.question_order}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-sm">{q.title}</div>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                                <span className="font-medium text-indigo-600">{q.topic}</span>
                                <span>•</span>
                                <span className="capitalize">{q.difficulty}</span>
                                <span>•</span>
                                <span>Test Cases: {q.test_cases_passed} / {q.total_test_cases} passed</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="font-mono font-bold text-sm text-slate-900 block">
                                {q.marks_awarded} <span className="text-xs font-normal text-slate-400">/ {q.max_marks}</span>
                              </span>
                              <span className={`text-[10px] uppercase font-bold ${
                                isAccepted ? 'text-emerald-600' : 'text-rose-600'
                              }`}>
                                {q.status}
                              </span>
                            </div>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </div>
                        </div>

                        {/* Collapsible Details */}
                        {isExpanded && (
                          <div className="p-4 bg-slate-50/70 border-t border-slate-100 space-y-4">
                            {/* Execution Telemetry */}
                            <div className="grid grid-cols-3 gap-3 text-xs bg-white p-3 rounded-xl border border-slate-200 font-mono">
                              <div>
                                <span className="text-slate-400 block text-[10px]">Execution Time</span>
                                <span className="font-bold text-slate-800">{q.execution_time_ms} ms</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">Memory Used</span>
                                <span className="font-bold text-slate-800">{q.memory_kb} KB</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">Submitted At</span>
                                <span className="font-bold text-slate-800">
                                  {q.submitted_at ? new Date(q.submitted_at).toLocaleTimeString() : 'N/A'}
                                </span>
                              </div>
                            </div>

                            {/* Submitted Code Block */}
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1.5">
                                  <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Final Submitted Python Code</span>
                                </span>
                              </div>
                              {q.submitted_code ? (
                                <pre className="p-4 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto max-h-60 leading-relaxed border border-slate-800">
                                  {q.submitted_code}
                                </pre>
                              ) : (
                                <div className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 italic text-center">
                                  No code submitted for this problem.
                                </div>
                              )}
                            </div>

                            {/* Test Cases Overview */}
                            {q.test_cases && q.test_cases.length > 0 && (
                              <div>
                                <span className="font-bold text-slate-700 text-[11px] block mb-1.5">Test Cases Evaluation</span>
                                <div className="space-y-1.5">
                                  {q.test_cases.map((tc: any) => (
                                    <div
                                      key={tc.index}
                                      className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-[11px] font-mono"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-700">Case {tc.index}:</span>
                                        <span className="text-slate-500">
                                          {tc.is_hidden ? '● Hidden Institutional Test Case' : `Input: ${tc.input?.replace(/\n/g, ' ')}`}
                                        </span>
                                      </div>
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        tc.is_hidden ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-700'
                                      }`}>
                                        {tc.is_hidden ? 'Hidden Case' : 'Public Case'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Security Audit Timeline */}
              {security?.logs && security.logs.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <span>Security & Anti-Cheating Event Stream</span>
                  </h3>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 max-h-48 overflow-y-auto">
                    {security.logs.map((log: any) => (
                      <div key={log.id} className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-mono font-bold text-[9px] uppercase">
                            {log.event_type}
                          </span>
                          <span className="text-slate-700 text-[11px]">{log.description}</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Authoritative evaluation verified from Turso database.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl text-xs transition"
          >
            Close Scorecard
          </button>
        </div>
      </div>
    </div>
  );
}
