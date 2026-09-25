'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  User,
  Shield,
  Clock,
  Calendar,
  Award,
  BookOpen,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Globe,
  Layers,
  TrendingUp,
  Activity,
  Code2,
  ShieldAlert,
  ArrowRight,
  Eye,
} from 'lucide-react';

interface Props {
  studentId: string | null;
  initialTab?: 'overview' | 'assessments' | 'questions' | 'security' | 'timeline';
  onClose: () => void;
  onSelectAttempt?: (attemptId: string) => void;
}

export function StudentProfileDrawer({ studentId, initialTab = 'overview', onClose, onSelectAttempt }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'assessments' | 'questions' | 'security' | 'timeline'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab || 'overview');
  }, [initialTab, studentId]);

  useEffect(() => {
    if (!studentId) {
      setData(null);
      return;
    }

    async function loadProfile() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/admin/students/${studentId}`);
        const json = await res.json();
        if (json.success && json.profile) {
          setData(json.profile);
        } else {
          setError(json.error || 'Failed to load profile');
        }
      } catch (err: any) {
        setError(err?.message || 'Error fetching student profile');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [studentId]);

  if (!studentId) return null;

  const student = data?.student;
  const stats = data?.stats;
  const currentActivity = data?.current_activity;
  const assessments = data?.recent_assessments || [];
  const questionPerformance = data?.question_performance || [];
  const security = data?.security_proctoring;
  const activityLogs = data?.recent_activity || [];

  const formatSeconds = (sec?: number) => {
    if (!sec || sec <= 0) return '0m 0s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white border-l border-slate-200 shadow-2xl flex flex-col justify-between overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xl shadow-xs">
            {student?.full_name ? student.full_name.charAt(0).toUpperCase() : 'S'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 leading-snug">
                {student?.full_name || 'Loading Profile...'}
              </h2>
              {student && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  student.online_status === 'ONLINE' || student.online_status === 'IN_ASSESSMENT'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : student.online_status === 'IDLE'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {student.online_status}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
              <span className="font-mono font-bold text-indigo-700">{student?.register_number}</span>
              <span>•</span>
              <span>{student?.department} • Year {student?.year} (Sec {student?.section || 'A'})</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="px-6 border-b border-slate-200 flex gap-1 bg-slate-50/50 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-3.5 border-b-2 transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Overview & Account
        </button>
        <button
          onClick={() => setActiveTab('assessments')}
          className={`py-3 px-3.5 border-b-2 transition whitespace-nowrap ${
            activeTab === 'assessments'
              ? 'border-indigo-600 text-indigo-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Assessment History ({assessments.length})
        </button>
        <button
          onClick={() => setActiveTab('questions')}
          className={`py-3 px-3.5 border-b-2 transition whitespace-nowrap ${
            activeTab === 'questions'
              ? 'border-indigo-600 text-indigo-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Question Performance
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`py-3 px-3.5 border-b-2 transition whitespace-nowrap ${
            activeTab === 'security'
              ? 'border-indigo-600 text-indigo-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Security & Proctoring
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`py-3 px-3.5 border-b-2 transition whitespace-nowrap ${
            activeTab === 'timeline'
              ? 'border-indigo-600 text-indigo-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Activity Timeline
        </button>
      </div>

      {/* Body Content */}
      <div className="p-6 overflow-y-auto flex-1 text-xs text-slate-700 space-y-6">
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Retrieving academic and assessment records from Turso...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700">
            {error}
          </div>
        ) : data ? (
          <>
            {/* TAB 1: OVERVIEW & ACCOUNT */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Live In-Assessment Card (if student is actively taking a test) */}
                {currentActivity && (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
                        <span className="font-bold text-blue-900 text-xs uppercase tracking-wider">
                          Currently in Assessment
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200 font-semibold">
                        {currentActivity.assessment_code || 'LIVE'}
                      </span>
                    </div>

                    <div>
                      <div className="text-base font-bold text-slate-900">{currentActivity.active_assessment_title}</div>
                      <div className="flex items-center gap-3 mt-1 text-slate-600">
                        <span>Progress: <strong>{currentActivity.current_question}</strong></span>
                        <span>•</span>
                        <span>Time Remaining: <strong>{formatSeconds(currentActivity.time_remaining_seconds)}</strong></span>
                      </div>
                    </div>

                    <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${currentActivity.progress_percent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* KPI Performance Highlights */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Assessments</span>
                    <span className="font-mono font-bold text-base text-slate-900">
                      {stats?.tests_completed} <span className="text-xs font-normal text-slate-400">/ {stats?.tests_attempted}</span>
                    </span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Average Score</span>
                    <span className="font-mono font-bold text-base text-emerald-600">{stats?.average_score}%</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Problems Solved</span>
                    <span className="font-mono font-bold text-base text-indigo-600">{stats?.problems_solved}</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Submissions</span>
                    <span className="font-mono font-bold text-base text-purple-600">{stats?.total_submissions}</span>
                  </div>
                </div>

                {/* Account Details Panel */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4 text-indigo-600" />
                    <span>Account Profile Details</span>
                  </h3>
                  <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-400">Institutional Email:</span>
                      <span className="font-mono text-slate-800">{student?.email}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-400">Account Status:</span>
                      <span className="font-semibold text-slate-800 capitalize">{student?.status}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-400">Department / Section:</span>
                      <span className="font-semibold text-slate-800">{student?.department} (Section {student?.section || 'A'})</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-400">Account Created:</span>
                      <span className="font-mono text-slate-800">{new Date(student?.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-400">Last Authentication:</span>
                      <span className="font-mono text-slate-800">
                        {student?.last_login ? new Date(student.last_login).toLocaleString() : 'Never logged in'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-400">Last Active Presence:</span>
                      <span className="font-mono text-slate-800">
                        {student?.last_active ? new Date(student.last_active).toLocaleString() : 'No activity logged'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Last Observed IP:</span>
                      <span className="font-mono text-slate-800">{student?.last_ip || '127.0.0.1'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ASSESSMENT HISTORY */}
            {activeTab === 'assessments' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Examination History ({assessments.length} Attempts)
                  </h3>
                  <span className="text-[11px] text-slate-400">Click attempt for evaluation scorecard</span>
                </div>

                {assessments.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400">
                    No assessment attempts recorded for this candidate.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assessments.map((a: any) => (
                      <div
                        key={a.id}
                        onClick={() => onSelectAttempt && onSelectAttempt(a.id)}
                        className="p-4 bg-white border border-slate-200 hover:border-indigo-400 rounded-2xl cursor-pointer transition shadow-xs space-y-2 group"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition">
                              {a.test_title}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-mono">
                              <span>Code: {a.test_code || a.test_id.slice(0, 8)}</span>
                              <span>•</span>
                              <span>Started: {new Date(a.start_time).toLocaleDateString()}</span>
                              <span>•</span>
                              <span>Time: {formatSeconds(a.time_taken_seconds)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-black text-base text-slate-900 block">
                              {a.score} <span className="text-xs font-normal text-slate-400">/ {a.max_score}</span>
                            </span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block ${
                              a.result_status === 'Passed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {a.result_status || a.status}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                          <span className="font-mono text-purple-700 font-semibold">Rank #{a.completion_rank}</span>
                          <span className="font-mono text-rose-600">
                            {a.violation_count > 0 ? `${a.violation_count}/3 Warnings` : '0 Warnings'}
                          </span>
                          <span className="text-indigo-600 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition">
                            View Scorecard <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: QUESTION PERFORMANCE */}
            {activeTab === 'questions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Question Performance Breakdown
                  </h3>
                  <span className="text-[11px] text-slate-400">{questionPerformance.length} Problems Tracked</span>
                </div>

                {questionPerformance.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400">
                    No problem submissions recorded yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {questionPerformance.map((q: any) => (
                      <div key={q.question_id} className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-bold text-slate-900 text-sm">
                              {q.question_number}. {q.title}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                              <span className="text-indigo-600 font-semibold">{q.topic}</span>
                              <span>•</span>
                              <span className="capitalize">{q.difficulty}</span>
                              <span>•</span>
                              <span>Test Cases: {q.passed_test_cases}/{q.total_test_cases} passed</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-sm text-slate-900 block">
                              {q.score} <span className="text-xs font-normal text-slate-400">/ {q.max_score}</span>
                            </span>
                            <span className={`text-[10px] font-bold uppercase ${
                              q.status === 'Accepted' ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {q.status}
                            </span>
                          </div>
                        </div>

                        {q.code && (
                          <pre className="p-2.5 bg-slate-900 text-emerald-400 rounded-lg font-mono text-[11px] max-h-32 overflow-x-auto overflow-y-auto">
                            {q.code}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: SECURITY & PROCTORING */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Warning Count</span>
                    <span className="font-mono font-bold text-base text-rose-600">
                      {security?.warning_count ?? 0} <span className="text-xs font-normal text-slate-400">/ 3</span>
                    </span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Fullscreen Exits</span>
                    <span className="font-mono font-bold text-base text-slate-900">{security?.fullscreen_exits ?? 0}</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Tab Switches</span>
                    <span className="font-mono font-bold text-base text-slate-900">{security?.tab_switches ?? 0}</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Copy / Paste</span>
                    <span className="font-mono font-bold text-base text-slate-900">{security?.copy_paste_events ?? 0}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <span>Security & Anti-Cheating Event Logs</span>
                  </h3>

                  {security?.recent_security_logs?.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400">
                      Zero security anomalies logged for this student. Perfect academic integrity integrity.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {security?.recent_security_logs?.map((l: any) => (
                        <div key={l.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-mono font-bold text-[9px] uppercase inline-block mb-1">
                              {l.event_type}
                            </span>
                            <p className="text-slate-700 text-xs">{l.description}</p>
                          </div>
                          <span className="font-mono text-[10px] text-slate-400 whitespace-nowrap ml-3">
                            {new Date(l.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: ACTIVITY TIMELINE */}
            {activeTab === 'timeline' && (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Institutional Activity Stream ({activityLogs.length} Events)</span>
                </h3>

                {activityLogs.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400">
                    No activity logs recorded.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                    {activityLogs.map((l: any) => (
                      <div key={l.id} className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded font-mono font-bold text-[9px] uppercase">
                            {l.event_type}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {new Date(l.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-700 text-xs">{l.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end sticky bottom-0">
        <button
          onClick={onClose}
          className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition"
        >
          Close Drawer
        </button>
      </div>
    </div>
  );
}
