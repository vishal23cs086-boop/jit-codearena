'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchAttempts, fetchStudents, fetchActivityLogs, fetchTests } from '@/lib/db';
import { LiveMonitorStudent, TestAttempt, StudentProfile, ActivityLog, Test } from '@/types';
import { StudentDetailModal } from '@/components/admin/StudentDetailModal';
import { EmptyState } from '@/components/ui/EmptyState';
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
} from 'lucide-react';

export default function LiveMonitorPage() {
  const [monitorStudents, setMonitorStudents] = useState<LiveMonitorStudent[]>([]);
  const [activeTest, setActiveTest] = useState<Test | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<LiveMonitorStudent | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [tests, attempts, students, logs] = await Promise.all([
        fetchTests(),
        fetchAttempts(),
        fetchStudents(),
        fetchActivityLogs(),
      ]);

      const currentActive = tests.find((t) => t.status === 'active') || tests[0] || null;
      setActiveTest(currentActive);

      // Map real attempts to LiveMonitorStudent records
      const studentMap = new Map<string, StudentProfile>();
      students.forEach((s) => studentMap.set(s.id, s));

      const monitorList: LiveMonitorStudent[] = attempts.map((att) => {
        const student = studentMap.get(att.student_id);
        const studentLogs = logs.filter((l) => l.student_id === att.student_id);
        const warningCount = (att.tab_switch_count || 0) + (att.fullscreen_exit_count || 0);

        let status: LiveMonitorStudent['status'] = 'not_started';
        if (att.status === 'submitted' || att.status === 'auto_submitted') {
          status = 'completed';
        } else if (att.status === 'in_progress') {
          if (warningCount >= 3) {
            status = 'suspicious';
          } else if (warningCount >= 1) {
            status = 'warning';
          } else {
            status = 'active';
          }
        }

        const elapsedSec = att.started_at
          ? Math.max(0, Math.floor((Date.now() - new Date(att.started_at).getTime()) / 1000))
          : 0;

        return {
          id: student?.id || att.student_id,
          attempt_id: att.id,
          student_name: student?.full_name || student?.register_number || 'Candidate',
          register_number: student?.register_number || 'UNKNOWN',
          department: student?.department || 'CSE',
          year: student?.year || 2,
          test_title: currentActive?.title || 'Coding Assessment',
          progress: att.status === 'submitted' ? 'Completed' : 'In Progress',
          current_score: att.score || 0,
          started_time: att.started_at
            ? new Date(att.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '—',
          elapsed_time_seconds: elapsedSec,
          status,
          warnings_count: warningCount,
          completion_time: att.completed_at
            ? new Date(att.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : undefined,
          tab_switches: att.tab_switch_count || 0,
          fullscreen_exits: att.fullscreen_exit_count || 0,
          copy_pastes: att.copy_paste_count || 0,
          current_question_index: 1,
          total_submissions: 1,
          recent_logs: studentLogs,
        };
      });

      setMonitorStudents(monitorList);
    } catch (err) {
      console.warn('Error loading live monitor data:', err);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // 15s real-time poll
    return () => clearInterval(interval);
  }, []);

  const filteredStudents = monitorStudents.filter((s) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      s.student_name.toLowerCase().includes(term) ||
      s.register_number.toLowerCase().includes(term) ||
      s.department.toLowerCase().includes(term);

    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: LiveMonitorStudent['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Warning
          </span>
        );
      case 'suspicious':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
            Suspicious
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
            Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            Not Started
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Student Drilldown Drawer / Modal */}
      <StudentDetailModal
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            <h1 className="text-2xl font-bold text-white">Live Examination Telemetry Monitor</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time candidate tracking for {activeTest?.title || 'active examinations'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTest && (
            <Link
              href={`/admin/rankings/${activeTest.id}`}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
            >
              <span>First Completion Rankings</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}

          <button
            onClick={loadData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700"
            title="Refresh stream"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-[11px] text-slate-400 block mb-0.5">Total Tracked</span>
          <span className="text-xl font-bold text-white">{monitorStudents.length}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-[11px] text-emerald-400 block mb-0.5">🟢 Active Now</span>
          <span className="text-xl font-bold text-emerald-400">
            {monitorStudents.filter((s) => s.status === 'active').length}
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-[11px] text-amber-400 block mb-0.5">🟡 Warnings Flagged</span>
          <span className="text-xl font-bold text-amber-300">
            {monitorStudents.filter((s) => s.status === 'warning').length}
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-[11px] text-rose-400 block mb-0.5">🔴 Suspicious</span>
          <span className="text-xl font-bold text-rose-300">
            {monitorStudents.filter((s) => s.status === 'suspicious').length}
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-[11px] text-blue-400 block mb-0.5">✅ Completed</span>
          <span className="text-xl font-bold text-blue-300">
            {monitorStudents.filter((s) => s.status === 'completed').length}
          </span>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search candidate name, reg no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-medium">Status Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Candidates</option>
            <option value="active">Active Now</option>
            <option value="warning">Warning Issued</option>
            <option value="suspicious">Suspicious Incident</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Live Candidates Table or Empty State */}
      {filteredStudents.length > 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-3">Reg Number</th>
                  <th className="py-3.5 px-3">Dept & Year</th>
                  <th className="py-3.5 px-3 text-center">Progress</th>
                  <th className="py-3.5 px-3 text-center">Score</th>
                  <th className="py-3.5 px-3 text-center">Started</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-3 text-center">Violations</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredStudents.map((st) => (
                  <tr
                    key={st.id}
                    onClick={() => setSelectedStudent(st)}
                    className="hover:bg-slate-800/40 transition cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-semibold text-white group-hover:text-indigo-300 transition">
                      {st.student_name}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-300">{st.register_number}</td>
                    <td className="py-3.5 px-3 text-slate-400">
                      {st.department} • Year {st.year}
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-slate-200">
                      {st.progress}
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono font-bold text-emerald-400">
                      {st.current_score} pts
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono text-slate-400">
                      {st.started_time}
                    </td>
                    <td className="py-3.5 px-3 text-center">{getStatusBadge(st.status)}</td>
                    <td className="py-3.5 px-3 text-center">
                      {st.warnings_count > 0 ? (
                        <span
                          className={`inline-flex items-center gap-1 font-bold ${
                            st.warnings_count >= 3 ? 'text-rose-400 animate-pulse' : 'text-amber-400'
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {st.warnings_count} ({st.tab_switches} tabs, {st.fullscreen_exits} fs)
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStudent(st);
                        }}
                        className="px-2.5 py-1 bg-slate-800 group-hover:bg-indigo-600/30 text-slate-300 group-hover:text-indigo-200 rounded-lg text-[11px] font-medium transition border border-slate-700"
                      >
                        Inspect Logs
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No candidates currently active in an assessment."
          description="Live telemetry, tab switch violations, and progress will appear in real-time as students attempt active tests."
        />
      )}
    </div>
  );
}
