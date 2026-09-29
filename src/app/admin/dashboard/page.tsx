'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Activity,
  Play,
  CheckCircle2,
  Clock,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  FileSpreadsheet,
  Layers,
  BookOpen,
  Radio,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  X,
  ShieldCheck,
  Check,
  Award,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { DashboardDrilldownModal, DrilldownCategory } from '@/components/admin/DashboardDrilldownModal';
import { StudentProfileDrawer } from '@/components/admin/StudentProfileDrawer';

interface DashboardStats {
  totalStudents: number;
  onlineCount: number;
  inAssessmentCount: number;
  completedAttempts: number;
  allTimeCompletedAttempts?: number;
  completedCountResetAt?: string | null;
  completedCountResetBy?: string | null;
  totalViolations: number;
  terminatedCount?: number;
  recentLogs: Array<{
    id: string;
    student_name: string;
    register_number: string;
    event_type: string;
    description: string;
    timestamp: string;
  }>;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    onlineCount: 0,
    inAssessmentCount: 0,
    completedAttempts: 0,
    allTimeCompletedAttempts: 0,
    completedCountResetAt: null,
    completedCountResetBy: null,
    totalViolations: 0,
    terminatedCount: 0,
    recentLogs: [],
  });
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drilldownCategory, setDrilldownCategory] = useState<DrilldownCategory | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Reset Completed Count state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [statsRes, assessRes] = await Promise.all([
        fetch(`/api/admin/dashboard-stats?_t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/admin/assessments?_t=${Date.now()}`, { cache: 'no-store' }),
      ]);
      const statsJson = await statsRes.json();
      const assessJson = await assessRes.json();

      if (statsJson.success && statsJson.stats) {
        setStats(statsJson.stats);
      }
      if (assessJson.success && Array.isArray(assessJson.assessments)) {
        setAssessments(assessJson.assessments);
      }
    } catch (err) {
      console.warn('Dashboard load error:', err);
    } finally {
      if (!silent) setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData(true);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleResetCompletedCount = async () => {
    try {
      setResetting(true);
      const res = await fetch('/api/admin/dashboard/reset-completed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset',
          assessmentId: 'global',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reset completed count.');
      }

      setShowResetModal(false);
      setToastMessage('✓ Dashboard completion counter reset to 0. All student records, attempts, and submissions remain preserved.');
      await loadData(true);
    } catch (err: any) {
      alert(err?.message || 'Failed to reset completed count.');
    } finally {
      setResetting(false);
    }
  };

  const handleRestoreCompletedCount = async () => {
    try {
      setResetting(true);
      const res = await fetch('/api/admin/dashboard/reset-completed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'restore',
          assessmentId: 'global',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to restore count.');
      }

      setShowResetModal(false);
      setToastMessage('✓ Full historical completion count restored.');
      await loadData(true);
    } catch (err: any) {
      alert(err?.message || 'Failed to restore completed count.');
    } finally {
      setResetting(false);
    }
  };

  const liveAssessments = assessments.filter((a) => a.status === 'live');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 text-xs flex items-center gap-3 animate-fade-in">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden border border-slate-200/90 shadow-sm shadow-slate-900/5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/60 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-5 relative z-10">
          <div className="w-16 h-16 p-2 rounded-2xl bg-white border border-slate-200/80 shadow-md flex items-center justify-center shrink-0">
            <img
              src="/jit-logo.png"
              alt="Jansons Institute of Technology Crest"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-semibold mb-2">
              <Radio className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
              <span>JANSONS INSTITUTE OF TECHNOLOGY • EXAMINATION CELL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Administration Control Center
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Real-time assessment invigilation, Turso telemetry, and automated candidate evaluation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => loadData(false)}
            className="p-2.5 bg-white hover:bg-slate-50 rounded-xl text-slate-600 border border-slate-200 shadow-xs transition"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/admin/rankings"
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition border border-indigo-200 shadow-sm"
          >
            <Award className="w-4 h-4 text-indigo-600" />
            <span>Rankings &amp; Leaderboard</span>
          </Link>
          <Link
            href="/admin/monitor"
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-emerald-600/20"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>Open Live Monitor</span>
          </Link>
          <Link
            href="/admin/reports"
            className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 transition border border-slate-200 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Reports</span>
          </Link>
        </div>
      </div>

      {/* Main KPI Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Students */}
        <div
          onClick={() => setDrilldownCategory('totalStudents')}
          className="bg-white/90 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/90 shadow-sm shadow-slate-900/5 hover:border-indigo-400 hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer group"
          title="Click to drill down into actual student records"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-indigo-600 transition-colors">Total Students</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200/60 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <Users className="w-4 h-4 text-indigo-600 group-hover:text-white transition-colors" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.totalStudents}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Registered in Turso</span>
        </div>

        {/* Online Now */}
        <div
          onClick={() => setDrilldownCategory('online')}
          className="bg-white/90 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/90 shadow-sm shadow-slate-900/5 hover:border-emerald-400 hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer group"
          title="Click to drill down into online student heartbeats"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-emerald-600 transition-colors">Online Now</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">{stats.onlineCount}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Active heartbeats</span>
        </div>

        {/* In Assessment */}
        <div
          onClick={() => setDrilldownCategory('in_assessment')}
          className="bg-white/90 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/90 shadow-sm shadow-slate-900/5 hover:border-blue-400 hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer group"
          title="Click to drill down into active test attempts"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-blue-600 transition-colors">In Assessment</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
              <Activity className="w-4 h-4 text-blue-600 group-hover:text-white transition-colors" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600">{stats.inAssessmentCount}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Attempting tests</span>
        </div>

        {/* Completed Attempts with Secure Reset Control */}
        <div
          onClick={() => setDrilldownCategory('completed')}
          className="bg-white/90 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/90 shadow-sm shadow-slate-900/5 hover:border-purple-400 hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer group relative"
          title="Click to drill down into completed assessment submissions"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-purple-600 transition-colors">Completed</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowResetModal(true);
                }}
                className="text-[10px] font-semibold text-slate-500 hover:text-purple-700 bg-slate-100 hover:bg-purple-100 px-2 py-0.5 rounded-md transition border border-slate-200/80 flex items-center gap-1"
                title="Reset completion counter for a new session"
              >
                <RotateCcw className="w-2.5 h-2.5 text-purple-600" />
                <span>Reset Completed Count</span>
              </button>
            </div>
            <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200/60 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all">
              <CheckCircle2 className="w-4 h-4 text-purple-600 group-hover:text-white transition-colors" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-600">{stats.completedAttempts}</div>
          <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
            <span>{stats.completedCountResetAt ? 'Since last reset' : 'Finalized submissions'}</span>
            {stats.completedCountResetAt && stats.allTimeCompletedAttempts !== undefined && (
              <span className="text-[10px] font-medium text-purple-600" title={`Historical submissions: ${stats.allTimeCompletedAttempts}`}>
                ({stats.allTimeCompletedAttempts} all-time)
              </span>
            )}
          </div>
        </div>

        {/* Security Warnings */}
        <div
          onClick={() => setDrilldownCategory('violations')}
          className="bg-white/90 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/90 shadow-sm shadow-slate-900/5 hover:border-rose-400 hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer group"
          title="Click to drill down into security & proctoring violation records"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-rose-600 transition-colors">Violations</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200/60 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-all">
              <ShieldAlert className="w-4 h-4 text-rose-600 group-hover:text-white transition-colors" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600">{stats.totalViolations}</div>
          <span className="text-[11px] text-rose-500 mt-1 block">Security anomalies</span>
        </div>

        {/* Terminated Attempts */}
        <div
          onClick={() => setDrilldownCategory('terminated')}
          className="bg-white/90 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/90 shadow-sm shadow-slate-900/5 hover:border-amber-400 hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer group"
          title="Click to drill down into proctoring terminated sessions and take action"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-amber-600 transition-colors">Terminated</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all">
              <AlertTriangle className="w-4 h-4 text-amber-600 group-hover:text-white transition-colors" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600">{stats.terminatedCount || 0}</div>
          <span className="text-[11px] text-amber-500 mt-1 block">Policy terminations</span>
        </div>
      </div>

      {/* Middle Section: Live Assessments & Live Event Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Test Overview */}
        <div className="lg:col-span-2 bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-7 space-y-5 border border-slate-200/90 shadow-sm shadow-slate-900/5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="font-bold text-slate-900 text-base">Active Examinations Overview</h3>
            </div>
            <Link
              href="/admin/tests"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition flex items-center gap-1.5"
            >
              <span>Manage All ({assessments.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {liveAssessments.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {liveAssessments.map((test) => (
                <div
                  key={test.id}
                  className="p-5 rounded-2xl border border-emerald-100 bg-emerald-50/20 space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                        LIVE NOW • YEAR {test.year}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">{test.title}</h4>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">Code: {test.code || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-600 pt-2 border-t border-emerald-100/60">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{test.duration}m</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>Year {test.year}</span>
                    </div>
                    <div className="flex items-center gap-1 ml-auto">
                      <span className="font-bold text-emerald-700">{test.total_marks || 100} Marks</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
              <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">No examination is currently running live.</p>
              <p className="text-[11px] text-slate-400 mt-1">Publish an assessment from the Assessments tab to initiate live invigilation.</p>
            </div>
          )}
        </div>

        {/* Live Proctoring & Security Feed */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-7 space-y-4 border border-slate-200/90 shadow-sm shadow-slate-900/5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <h3 className="font-bold text-slate-900 text-sm">Security & Audit Stream</h3>
            </div>
            <Link href="/admin/logs" className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition">
              Full Logs
            </Link>
          </div>

          {stats.recentLogs && stats.recentLogs.length > 0 ? (
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {stats.recentLogs.slice(0, 8).map((l) => (
                <div
                  key={l.id}
                  className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-[11px] truncate max-w-[150px]">
                      {l.student_name || l.register_number}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1 py-0.2 bg-amber-100 text-amber-800 text-[9px] rounded font-bold uppercase">
                      {l.event_type}
                    </span>
                    <p className="text-[11px] text-slate-600 font-sans truncate">{l.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No events recorded yet"
              description="Anti-cheating deterrent telemetry, student logins, and evaluations will stream here live."
            />
          )}
        </div>
      </div>

      {/* DASHBOARD DRILL-DOWN MODAL */}
      <DashboardDrilldownModal
        category={drilldownCategory}
        onClose={() => setDrilldownCategory(null)}
        onSelectStudent={(studentId) => {
          setSelectedStudentId(studentId);
        }}
      />

      {/* STUDENT PROFILE DRAWER */}
      <StudentProfileDrawer
        studentId={selectedStudentId}
        onClose={() => setSelectedStudentId(null)}
      />

      {/* SECURE RESET COMPLETED COUNT CONFIRMATION MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-200 shadow-2xl space-y-5 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Reset Completed Count</h3>
                  <span className="text-[11px] text-slate-400 font-medium">Dashboard Metric Reset</span>
                </div>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Explanatory Warning & Safety Guarantee */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-900 leading-snug">
                Reset the completed count?
              </p>
              <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 leading-relaxed space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5 text-purple-950">
                  <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Non-Destructive Counter Operation</span>
                </p>
                <p className="text-[12px] text-purple-900 leading-normal">
                  This will reset the dashboard completion counter but will <strong>NOT</strong> delete student data, submissions, results, or attempts.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Current Displayed Count:</span>
                  <strong className="text-slate-900">{stats.completedAttempts}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Total Historical Records:</span>
                  <strong className="text-purple-700">{stats.allTimeCompletedAttempts || stats.completedAttempts} preserved in Turso</strong>
                </div>
                {stats.completedCountResetAt && (
                  <div className="flex justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                    <span>Last Reset:</span>
                    <span>{new Date(stats.completedCountResetAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              {stats.completedCountResetAt ? (
                <button
                  type="button"
                  onClick={handleRestoreCompletedCount}
                  disabled={resetting}
                  className="text-xs text-slate-500 hover:text-slate-800 underline transition"
                  title="Remove the reset filter and show all historical completions"
                >
                  Restore All-Time
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  disabled={resetting}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800 rounded-xl font-medium transition hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetCompletedCount}
                  disabled={resetting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
                  <span>{resetting ? 'Resetting...' : 'Reset Count'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
