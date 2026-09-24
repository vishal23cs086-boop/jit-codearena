'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Activity,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  RefreshCw,
  ExternalLink,
  Radio,
  User,
  Eye,
  Laptop,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { StudentDetailSidePanel } from '@/components/admin/StudentDetailSidePanel';

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

export default function LiveMonitorPage() {
  const [students, setStudents] = useState<PresenceStudent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<PresenceStudent | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchPresence = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch('/api/admin/presence');
      const data = await res.json();
      if (data.success && Array.isArray(data.students)) {
        setStudents(data.students);
        // If a student is currently selected in drawer, update their state
        if (selectedStudent) {
          const updated = data.students.find((s: PresenceStudent) => s.student_id === selectedStudent.student_id);
          if (updated) setSelectedStudent(updated);
        }
      }
    } catch (err) {
      console.warn('Error fetching live presence:', err);
    } finally {
      if (!silent) setIsRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresence();
  }, []);

  // 4-second automated live polling
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchPresence(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedStudent]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.register_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.department.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'in_assessment') return s.session_status === 'IN_ASSESSMENT' || (s.session_status === 'WARNING' && s.active_assessment_id);
      if (statusFilter === 'warning') return s.violation_count > 0 || s.session_status === 'WARNING';
      if (statusFilter === 'online') return s.session_status === 'ONLINE';
      if (statusFilter === 'idle') return s.session_status === 'IDLE';
      if (statusFilter === 'offline') return s.session_status === 'OFFLINE';

      return true;
    });
  }, [students, searchTerm, statusFilter]);

  const inAssessmentCount = students.filter(
    (s) => s.session_status === 'IN_ASSESSMENT' || (s.session_status === 'WARNING' && s.active_assessment_id)
  ).length;
  const warningsCount = students.filter((s) => s.violation_count > 0).length;
  const onlineCount = students.filter((s) => s.session_status === 'ONLINE').length;
  const idleCount = students.filter((s) => s.session_status === 'IDLE').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-600">
              <Activity className="w-4 h-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Live Examination Proctoring</h1>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>4s Telemetry</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Real-time candidate presence, heartbeat latency, active question progression, and proctoring violation alerts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <label className="flex items-center gap-2 text-xs text-slate-600 font-medium cursor-pointer bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-0"
            />
            <span>Auto Polling</span>
          </label>

          <button
            onClick={() => fetchPresence(false)}
            disabled={isRefreshing}
            className="glass-button p-2.5 rounded-xl text-slate-600 hover:text-indigo-600 transition"
            title="Manual sync"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* METRIC KPI TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="glass-card rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">In Assessment</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-600 font-mono">{inAssessmentCount}</span>
            <span className="text-xs text-slate-400">candidates</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Security Warnings</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600 font-mono">{warningsCount}</span>
            <span className="text-xs text-rose-400">flagged</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Online (Standby)</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 font-mono">{onlineCount}</span>
            <span className="text-xs text-slate-400">ready</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Idle / Latent</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 font-mono">{idleCount}</span>
            <span className="text-xs text-slate-400">&gt;45s latent</span>
          </div>
        </div>
      </div>

      {/* CONTROLS BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search candidates by name, reg no, dept..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 text-xs">
          {[
            { id: 'all', label: `All (${students.length})` },
            { id: 'in_assessment', label: `In Exam (${inAssessmentCount})` },
            { id: 'warning', label: `Flagged (${warningsCount})` },
            { id: 'online', label: `Online (${onlineCount})` },
            { id: 'idle', label: `Idle (${idleCount})` },
            { id: 'offline', label: 'Offline' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-medium transition ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CANDIDATE TELEMETRY LIST */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Connecting to telemetry heartbeat stream...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs">
          <EmptyState
            title="No Active Candidate Sessions"
            description={
              searchTerm
                ? `No candidates found matching "${searchTerm}".`
                : 'No candidate heartbeats have been registered in the database yet. When students log in or take assessments, real-time presence indicators will appear here.'
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((s) => {
            const lastSeenSec = Math.max(0, Math.floor((Date.now() - s.last_seen) / 1000));
            const hasViolations = s.violation_count > 0;
            const isExam = s.session_status === 'IN_ASSESSMENT' || (s.session_status === 'WARNING' && s.active_assessment_id);

            return (
              <div
                key={s.student_id}
                onClick={() => setSelectedStudent(s)}
                className={`glass-card rounded-2xl p-4 border transition-all cursor-pointer hover:shadow-md ${
                  hasViolations
                    ? 'border-rose-300 bg-rose-50/20 hover:border-rose-400'
                    : isExam
                    ? 'border-blue-200 bg-blue-50/20 hover:border-blue-300'
                    : 'border-slate-200 hover:border-indigo-300'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{s.full_name}</h3>
                    <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                      <span className="font-bold text-indigo-700">{s.register_number}</span>
                      <span>•</span>
                      <span>{s.department} Year {s.year}</span>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div>
                    {s.session_status === 'IN_ASSESSMENT' && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] uppercase inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        In Exam
                      </span>
                    )}
                    {s.session_status === 'WARNING' && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px] uppercase inline-flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        Violations ({s.violation_count})
                      </span>
                    )}
                    {s.session_status === 'ONLINE' && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] uppercase inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Online
                      </span>
                    )}
                    {s.session_status === 'IDLE' && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold text-[10px] uppercase inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Idle
                      </span>
                    )}
                    {s.session_status === 'OFFLINE' && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium text-[10px] uppercase">
                        Offline
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress / Status details */}
                <div className="py-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-[11px] text-slate-400">Active Location:</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[170px]">
                      {s.active_assessment_id ? s.active_assessment_id : s.current_page || 'Dashboard'}
                    </span>
                  </div>

                  {s.active_assessment_id && s.total_questions > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Question Progress:</span>
                      <span className="font-mono font-bold text-indigo-600 text-xs">
                        Question {s.current_question_index + 1} of {s.total_questions}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-[11px] text-slate-400">Heartbeat:</span>
                    <span className="font-mono text-slate-700 text-[11px]">{lastSeenSec}s ago</span>
                  </div>
                </div>

                {/* Footer action trigger */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-mono">{s.ip_address || '127.0.0.1'}</span>
                  <span className="text-indigo-600 font-semibold group-hover:underline flex items-center gap-1">
                    <span>Inspect Candidate</span>
                    <Eye className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* STUDENT DETAIL SIDE PANEL DRAWER */}
      <StudentDetailSidePanel
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
        onActionComplete={() => fetchPresence(false)}
      />
    </div>
  );
}
