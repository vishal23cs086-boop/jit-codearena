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
  ShieldAlert,
} from 'lucide-react';

interface StudentProfileData {
  student: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    register_number: string;
    department: string;
    year: number;
    section: string;
    phone?: string;
    status: 'active' | 'disabled' | 'archived';
    is_archived: boolean;
    created_at: string;
    updated_at?: string;
    last_login?: string | null;
    last_ip?: string;
  };
  stats: {
    tests_attempted: number;
    tests_completed: number;
    average_score: number;
    highest_score: number;
    problems_solved: number;
    total_submissions: number;
  };
  recent_assessments: Array<{
    id: string;
    test_id: string;
    test_title: string;
    test_code?: string;
    test_duration: number;
    score: number;
    max_score: number;
    status: string;
    start_time: string;
    end_time?: string | null;
    tab_switches: number;
    fullscreen_exits: number;
    violation_count: number;
    created_at: string;
  }>;
  recent_activity: Array<{
    id: string;
    event_type: string;
    description: string;
    metadata: any;
    timestamp: string;
  }>;
  security_history?: {
    student_name: string;
    register_number: string;
    department: string;
    year: number;
    assessment_title: string;
    assessment_status: string;
    warning_count: number;
    max_warning_limit: number;
    total_security_events: number;
    events: Array<{
      formatted: string;
      event_type: string;
      timestamp: string;
      time_formatted: string;
      description: string;
      metadata: any;
    }>;
  };
}

interface Props {
  studentId: string | null;
  onClose: () => void;
}

export function StudentProfileDrawer({ studentId, onClose }: Props) {
  const [data, setData] = useState<StudentProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white border-l border-slate-200 shadow-2xl flex flex-col justify-between overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-lg shadow-xs">
            {data?.student.full_name ? data.student.full_name.charAt(0).toUpperCase() : 'S'}
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 leading-snug">
              {data?.student.full_name || 'Loading Profile...'}
            </h2>
            <div className="flex items-center gap-2 mt-0.5 text-xs">
              <span className="font-mono font-bold text-indigo-700">{data?.student.register_number}</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 font-medium">
                {data?.student.department} • Year {data?.student.year} (Sec {data?.student.section || 'A'})
              </span>
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

      {/* Body */}
      <div className="p-6 space-y-6 flex-1 text-xs text-slate-700">
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Retrieving academic and assessment records from Turso...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs">
            {error}
          </div>
        ) : data ? (
          <>
            {/* Status & Identity Ribbon */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Institutional Standing:</span>
              <div>
                {data.student.status === 'active' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Active Candidate
                  </span>
                )}
                {data.student.status === 'disabled' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-bold text-xs">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Account Disabled
                  </span>
                )}
                {data.student.status === 'archived' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Archived Record
                  </span>
                )}
              </div>
            </div>

            {/* Assessment Statistics Grid */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-indigo-600" />
                <span>Assessment Statistics</span>
              </h3>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[11px] text-slate-400 block">Tests Attempted</span>
                  <span className="font-mono font-bold text-base text-slate-900">{data.stats.tests_attempted}</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[11px] text-slate-400 block">Tests Completed</span>
                  <span className="font-mono font-bold text-base text-blue-600">{data.stats.tests_completed}</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[11px] text-slate-400 block">Average Score</span>
                  <span className="font-mono font-bold text-base text-emerald-600">{data.stats.average_score}%</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[11px] text-slate-400 block">Highest Score</span>
                  <span className="font-mono font-bold text-base text-indigo-600">{data.stats.highest_score}</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[11px] text-slate-400 block">Problems Solved</span>
                  <span className="font-mono font-bold text-base text-purple-600">{data.stats.problems_solved}</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[11px] text-slate-400 block">Submissions</span>
                  <span className="font-mono font-bold text-base text-slate-700">{data.stats.total_submissions}</span>
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-indigo-600" />
                <span>Candidate Information</span>
              </h3>

              <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Institutional Email:</span>
                  <span className="font-mono text-slate-800">{data.student.email}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Department:</span>
                  <span className="font-semibold text-slate-800">{data.student.department}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Enrolled Year:</span>
                  <span className="font-semibold text-slate-800">Year {data.student.year} (Section {data.student.section || 'A'})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Registration Date:</span>
                  <span className="font-mono text-slate-700">{new Date(data.student.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Last Authentication:</span>
                  <span className="font-mono text-slate-700">
                    {data.student.last_login ? new Date(data.student.last_login).toLocaleString() : 'No logins recorded'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Last Observed IP:</span>
                  <span className="font-mono text-slate-700">{data.student.last_ip || '127.0.0.1'}</span>
                </div>
              </div>
            </div>

            {/* Recent Assessments History */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-indigo-600" />
                <span>Recent Assessments</span>
              </h3>

              {data.recent_assessments.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                  No examination attempts recorded yet for this student.
                </div>
              ) : (
                <div className="space-y-2">
                  {data.recent_assessments.map((att) => (
                    <div key={att.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 block">{att.test_title}</span>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-mono">
                          <span>{new Date(att.created_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{att.violation_count > 0 ? `${att.violation_count} Flags` : '0 Flags'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-sm text-indigo-700">
                          {att.score}/{att.max_score}
                        </span>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">
                          {att.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Security History & Proctoring Violations (Requirement 3) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Security History & Proctoring Violations</span>
                </h3>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                  Warnings: {data.security_history?.warning_count ?? 0} / {data.security_history?.max_warning_limit ?? 3} Max
                </span>
              </div>

              <div className="p-4 bg-rose-50/40 border border-rose-200/80 rounded-2xl space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Assessment:</span>
                    <span className="font-bold text-slate-900 block truncate">{data.security_history?.assessment_title || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Assessment Status:</span>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-white text-slate-800 border border-slate-200 mt-0.5">
                      {data.security_history?.assessment_status || 'NONE'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Total Security Events:</span>
                    <span className="font-mono font-black text-rose-600 text-sm">{data.security_history?.total_security_events ?? 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Warning Status:</span>
                    <span className={`text-[11px] font-bold ${
                      (data.security_history?.warning_count ?? 0) >= 3 ? 'text-rose-700' : 'text-amber-700'
                    }`}>
                      {(data.security_history?.warning_count ?? 0) >= 3 ? 'TERMINATION LIMIT REACHED' : 'NORMAL IN ASSESSMENT'}
                    </span>
                  </div>
                </div>

                {/* Timestamped events list */}
                <div className="pt-2 border-t border-rose-200/60">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">
                    Timestamped Security Events ({data.security_history?.events?.length ?? 0}):
                  </span>
                  {(!data.security_history?.events || data.security_history.events.length === 0) ? (
                    <div className="p-3 bg-white/80 rounded-xl text-center text-slate-400 text-xs border border-rose-100">
                      Clean record: No security violations logged for this candidate.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {data.security_history.events.map((ev, idx) => (
                        <div
                          key={ev.timestamp + idx}
                          className="p-2 bg-white rounded-xl border border-rose-200/70 flex items-center justify-between text-xs font-mono"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            <span className="font-bold text-slate-900">{ev.formatted}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-sans truncate max-w-[180px]">
                            {ev.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Activity Telemetry Stream */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Recent Activity Stream</span>
              </h3>

              {data.recent_activity.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                  No audit logs recorded yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {data.recent_activity.map((l) => (
                    <div key={l.id} className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono font-bold text-[9px] rounded uppercase">
                          {l.event_type}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate">{l.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end sticky bottom-0">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition"
        >
          Close Drawer
        </button>
      </div>
    </div>
  );
}
