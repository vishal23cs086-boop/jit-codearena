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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              {student.student_name.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-white text-base">{student.student_name}</h3>
              <p className="text-xs text-slate-400 font-mono">
                Reg: {student.register_number} • {student.department} Year {student.year}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Status summary banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-0.5">Session Status</span>
              <span className="font-bold text-white uppercase tracking-wider">{student.status}</span>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-0.5">Current Score</span>
              <span className="font-bold text-emerald-400 text-sm">{student.current_score} pts</span>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-0.5">Progress</span>
              <span className="font-bold text-indigo-400">{student.progress}</span>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-0.5">Total Submissions</span>
              <span className="font-bold text-white">{student.total_submissions} attempts</span>
            </div>
          </div>

          {/* Anti-Cheating Incident Audit Counters */}
          <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <h4 className="font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Anti-Cheating Telemetry Audit</span>
              </h4>
              <span className="text-[11px] text-slate-400">Total Warnings: {student.warnings_count}</span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div
                className={`p-3 rounded-lg border ${
                  student.tab_switches > 0
                    ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <span className="text-[11px] block">Tab Switches</span>
                <span className="text-base font-bold">{student.tab_switches}</span>
              </div>

              <div
                className={`p-3 rounded-lg border ${
                  student.fullscreen_exits > 0
                    ? 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <span className="text-[11px] block">Fullscreen Exits</span>
                <span className="text-base font-bold">{student.fullscreen_exits}</span>
              </div>

              <div
                className={`p-3 rounded-lg border ${
                  student.copy_pastes > 0
                    ? 'bg-purple-950/20 border-purple-500/30 text-purple-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <span className="text-[11px] block">Copy / Paste Blocked</span>
                <span className="text-base font-bold">{student.copy_pastes}</span>
              </div>
            </div>
          </div>

          {/* Activity Log stream */}
          <div className="space-y-2">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <span>Recent Activity Log Stream</span>
            </h4>

            <div className="bg-slate-950 rounded-xl border border-slate-800 divide-y divide-slate-800/80 max-h-48 overflow-y-auto font-mono">
              {student.recent_logs && student.recent_logs.length > 0 ? (
                student.recent_logs.map((log) => (
                  <div key={log.id} className="p-2.5 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 text-[10px]">
                        {log.event_type}
                      </span>
                      <span className="text-slate-300">
                        {log.details ? JSON.stringify(log.details) : 'Event recorded'}
                      </span>
                    </div>
                    <span className="text-slate-500 text-[10px]">{log.created_at}</span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-slate-500 font-sans">
                  No security incidents recorded for this candidate.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition text-xs font-semibold"
          >
            Close Drilldown
          </button>
        </div>
      </div>
    </div>
  );
};
