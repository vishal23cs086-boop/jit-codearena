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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-card border border-white/10 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-base shadow-inner">
              {student.student_name.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-white text-base">{student.student_name}</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Reg: <span className="text-indigo-400">{student.register_number}</span> • {student.department} Year {student.year}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.06] transition border border-transparent hover:border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Status summary banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/[0.02] p-3.5 rounded-2xl border border-white/5">
              <span className="text-slate-400 block mb-1">Session Status</span>
              <span className="font-bold text-white uppercase tracking-wider">{student.status}</span>
            </div>
            <div className="bg-white/[0.02] p-3.5 rounded-2xl border border-white/5">
              <span className="text-slate-400 block mb-1">Current Score</span>
              <span className="font-bold text-emerald-400 text-sm">{student.current_score} pts</span>
            </div>
            <div className="bg-white/[0.02] p-3.5 rounded-2xl border border-white/5">
              <span className="text-slate-400 block mb-1">Progress</span>
              <span className="font-bold text-indigo-400">{student.progress}</span>
            </div>
            <div className="bg-white/[0.02] p-3.5 rounded-2xl border border-white/5">
              <span className="text-slate-400 block mb-1">Total Submissions</span>
              <span className="font-bold text-white">{student.total_submissions} attempts</span>
            </div>
          </div>

          {/* Anti-Cheating Incident Audit Counters */}
          <div className="bg-white/[0.02] rounded-2xl p-5 border border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h4 className="font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Anti-Cheating Telemetry Audit</span>
              </h4>
              <span className="text-[11px] text-slate-400">Total Warnings: <strong className="text-white">{student.warnings_count}</strong></span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div
                className={`p-3.5 rounded-xl border ${
                  student.tab_switches > 0
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-white/[0.02] border-white/5 text-slate-400'
                }`}
              >
                <span className="text-[11px] block mb-1">Tab Switches</span>
                <span className="text-lg font-bold text-white">{student.tab_switches}</span>
              </div>

              <div
                className={`p-3.5 rounded-xl border ${
                  student.fullscreen_exits > 0
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : 'bg-white/[0.02] border-white/5 text-slate-400'
                }`}
              >
                <span className="text-[11px] block mb-1">Fullscreen Exits</span>
                <span className="text-lg font-bold text-white">{student.fullscreen_exits}</span>
              </div>

              <div
                className={`p-3.5 rounded-xl border ${
                  student.copy_pastes > 0
                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                    : 'bg-white/[0.02] border-white/5 text-slate-400'
                }`}
              >
                <span className="text-[11px] block mb-1">Copy / Paste Blocked</span>
                <span className="text-lg font-bold text-white">{student.copy_pastes}</span>
              </div>
            </div>
          </div>

          {/* Activity Log stream */}
          <div className="space-y-3">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <span>Recent Activity Log Stream</span>
            </h4>

            <div className="bg-black/40 rounded-2xl border border-white/10 divide-y divide-white/5 max-h-56 overflow-y-auto font-mono">
              {student.recent_logs && student.recent_logs.length > 0 ? (
                student.recent_logs.map((log) => (
                  <div key={log.id} className="p-3 flex items-center justify-between text-[11px] hover:bg-white/[0.02] transition">
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-semibold shrink-0">
                        {log.event_type}
                      </span>
                      <span className="text-slate-300 truncate font-sans">
                        {log.details ? (typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details)) : 'Event recorded'}
                      </span>
                    </div>
                    <span className="text-slate-500 text-[10px] shrink-0">
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
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 glass-card-hover rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition border border-white/10"
          >
            Close Drilldown
          </button>
        </div>
      </div>
    </div>
  );
};
