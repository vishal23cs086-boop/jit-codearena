'use client';

import React from 'react';
import { LiveMonitorStudent } from '@/types';
import {
  X,
  User,
  ShieldAlert,
  Clock,
  Code2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Activity,
} from 'lucide-react';

interface StudentDetailModalProps {
  student: LiveMonitorStudent | null;
  onClose: () => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ student, onClose }) => {
  if (!student) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200/60 text-indigo-700 flex items-center justify-center font-bold text-base shadow-sm">
              {student.student_name.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">{student.student_name}</h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Reg: <span className="text-indigo-600 font-semibold">{student.register_number}</span> • {student.department} Year {student.year}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Status summary banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70">
              <span className="text-slate-500 block mb-1 font-medium">Session Status</span>
              <span className="font-bold text-slate-900 uppercase tracking-wider">{student.status}</span>
            </div>
            <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70">
              <span className="text-slate-500 block mb-1 font-medium">Current Score</span>
              <span className="font-bold text-emerald-600 text-sm">{student.current_score} pts</span>
            </div>
            <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70">
              <span className="text-slate-500 block mb-1 font-medium">Progress</span>
              <span className="font-bold text-indigo-600">{student.progress}</span>
            </div>
            <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70">
              <span className="text-slate-500 block mb-1 font-medium">Total Submissions</span>
              <span className="font-bold text-slate-900">{student.total_submissions} attempts</span>
            </div>
          </div>

          {/* Anti-Cheating Incident Audit Counters */}
          <div className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <span>Anti-Cheating Telemetry Audit</span>
              </h4>
              <span className="text-[11px] text-slate-500">Total Warnings: <strong className="text-slate-900">{student.warnings_count}</strong></span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div
                className={`p-3.5 rounded-xl border ${
                  student.tab_switches > 0
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'bg-white border-slate-200 text-slate-500'
                }`}
              >
                <span className="text-[11px] block mb-1 font-medium">Tab Switches</span>
                <span className="text-lg font-bold text-slate-900">{student.tab_switches}</span>
              </div>

              <div
                className={`p-3.5 rounded-xl border ${
                  student.fullscreen_exits > 0
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-white border-slate-200 text-slate-500'
                }`}
              >
                <span className="text-[11px] block mb-1 font-medium">Fullscreen Exits</span>
                <span className="text-lg font-bold text-slate-900">{student.fullscreen_exits}</span>
              </div>

              <div
                className={`p-3.5 rounded-xl border ${
                  student.copy_pastes > 0
                    ? 'bg-purple-50 border-purple-200 text-purple-700'
                    : 'bg-white border-slate-200 text-slate-500'
                }`}
              >
                <span className="text-[11px] block mb-1 font-medium">Copy / Paste Blocked</span>
                <span className="text-lg font-bold text-slate-900">{student.copy_pastes}</span>
              </div>
            </div>
          </div>

          {/* Activity Log stream */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              <span>Recent Activity Log Stream</span>
            </h4>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 divide-y divide-slate-100 max-h-56 overflow-y-auto font-mono">
              {student.recent_logs && student.recent_logs.length > 0 ? (
                student.recent_logs.map((log) => (
                  <div key={log.id} className="p-3 flex items-center justify-between text-[11px] hover:bg-white transition">
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-[10px] font-semibold shrink-0">
                        {log.event_type}
                      </span>
                      <span className="text-slate-700 truncate font-sans">
                        {log.details ? (typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details)) : 'Event recorded'}
                      </span>
                    </div>
                    <span className="text-slate-400 text-[10px] shrink-0 font-mono">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-slate-500 font-sans">
                  No security incidents recorded for this candidate.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 transition border border-slate-200 shadow-sm"
          >
            Close Drilldown
          </button>
        </div>
      </div>
    </div>
  );
};
