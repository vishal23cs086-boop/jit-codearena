'use client';

import React, { useState } from 'react';
import {
  X,
  User,
  Shield,
  AlertTriangle,
  Clock,
  Laptop,
  Globe,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Ban,
  RotateCcw,
  Send,
} from 'lucide-react';

interface PresenceStudent {
  student_id: string;
  register_number: string;
  full_name: string;
  department: string;
  year: number;
  section?: string;
  current_page?: string;
  active_assessment_id?: string | null;
  current_question_index: number;
  total_questions: number;
  violation_count: number;
  session_status: 'ONLINE' | 'IDLE' | 'IN_ASSESSMENT' | 'WARNING' | 'OFFLINE';
  last_seen: number;
  started_at?: number | null;
  user_agent?: string;
  ip_address?: string;
}

interface Props {
  student: PresenceStudent | null;
  onClose: () => void;
  onActionComplete?: () => void;
}

export function StudentDetailSidePanel({ student, onClose, onActionComplete }: Props) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  if (!student) return null;

  const handleAction = async (action: 'terminate' | 'reset_warnings') => {
    try {
      setLoadingAction(action);
      setActionNotice(null);
      const res = await fetch('/api/admin/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          student_id: student.student_id,
          register_number: student.register_number,
          assessment_id: student.active_assessment_id,
          reason: action === 'terminate' ? 'Proctoring violation or administrative termination' : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice(data.message || 'Action executed successfully.');
        if (onActionComplete) onActionComplete();
      } else {
        alert(data.error || 'Action failed.');
      }
    } catch (err: any) {
      alert(err?.message || 'Request failed.');
    } finally {
      setLoadingAction(null);
    }
  };

  const statusBadge = () => {
    switch (student.session_status) {
      case 'IN_ASSESSMENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Taking Assessment
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs animate-bounce">
            <AlertTriangle className="w-3.5 h-3.5" />
            Security Flag ({student.violation_count} Violations)
          </span>
        );
      case 'ONLINE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Online & Ready
          </span>
        );
      case 'IDLE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Idle
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-medium text-xs">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Offline
          </span>
        );
    }
  };

  const secondsSinceHeartbeat = Math.max(0, Math.floor((Date.now() - student.last_seen) / 1000));

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col justify-between overflow-y-auto">
      {/* Drawer Header */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 leading-tight">{student.full_name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-xs font-bold text-indigo-700">{student.register_number}</span>
              <span className="text-[11px] text-slate-400">•</span>
              <span className="text-[11px] text-slate-500 font-medium">
                {student.department} • Year {student.year} (Sec {student.section || 'A'})
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

      {/* Drawer Body Content */}
      <div className="p-6 space-y-6 flex-1 text-xs text-slate-700">
        {/* Status Badge Block */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
          <span className="text-slate-500 font-semibold">Current State:</span>
          {statusBadge()}
        </div>

        {actionNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Live Proctoring & Heartbeat Status */}
        <div className="space-y-3">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Live Proctoring Telemetry
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-400 block">Heartbeat Age</span>
              <span className="font-mono font-bold text-sm text-slate-900">{secondsSinceHeartbeat}s ago</span>
            </div>
            <div className={`p-3 rounded-xl border space-y-1 ${
              student.violation_count > 0
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <span className="text-[11px] opacity-75 block">Violations Logged</span>
              <span className="font-mono font-bold text-sm">{student.violation_count}</span>
            </div>
          </div>
        </div>

        {/* Assessment Progress Block */}
        <div className="space-y-3">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Assessment Activity
          </h3>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Active Test:</span>
              <span className="font-semibold text-slate-900">
                {student.active_assessment_id ? student.active_assessment_id : 'None (Viewing Dashboard)'}
              </span>
            </div>
            {student.active_assessment_id && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Question Position:</span>
                  <span className="font-mono font-bold text-indigo-700">
                    Question {student.current_question_index + 1} of {student.total_questions || '?'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Current URL:</span>
                  <span className="font-mono text-[11px] text-slate-600 truncate max-w-[200px]">
                    {student.current_page || '/student/assessments'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Network & Session Fingerprint */}
        <div className="space-y-3">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Session Fingerprint
          </h3>
          <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2 text-[11px]">
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-500">IP Address:</span>
              <span className="font-mono font-medium text-slate-800">{student.ip_address || '127.0.0.1'}</span>
            </div>
            <div className="flex items-start gap-2 pt-1 border-t border-slate-100">
              <Laptop className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span className="text-slate-500 shrink-0">Client:</span>
              <span className="text-slate-600 break-all">{student.user_agent || 'Standard Desktop Browser'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Drawer Action Buttons Footer */}
      <div className="p-6 border-t border-slate-200 bg-slate-50/50 space-y-2.5">
        <div className="flex items-center gap-2">
          {/* Reset Violations Button */}
          <button
            onClick={() => handleAction('reset_warnings')}
            disabled={loadingAction !== null}
            className="flex-1 py-2.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Warnings</span>
          </button>

          {/* Terminate Session Button */}
          <button
            onClick={() => {
              if (confirm(`Are you sure you want to terminate ${student.full_name}'s session? They will be disqualified from the active test.`)) {
                handleAction('terminate');
              }
            }}
            disabled={loadingAction !== null}
            className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-xs disabled:opacity-50"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Terminate Session</span>
          </button>
        </div>
      </div>
    </div>
  );
}
