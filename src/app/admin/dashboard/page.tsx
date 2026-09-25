'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
  ArrowLeft,
  FileSpreadsheet,
  Layers,
  BookOpen,
  Radio,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Search,
  Filter,
  X,
  ChevronRight,
  Eye,
  Award,
  Flame,
  Check,
  Shield,
  Smartphone,
  Laptop,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { StudentProfileDrawer } from '@/components/admin/StudentProfileDrawer';
import { CompletedAttemptModal } from '@/components/admin/CompletedAttemptModal';

type DrillDownView = 'overview' | 'students' | 'online' | 'in_assessment' | 'completed' | 'violations';

interface DashboardStats {
  totalStudents: number;
  onlineCount: number;
  inAssessmentCount: number;
  completedAttempts: number;
  totalViolations: number;
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
  const [view, setView] = useState<DrillDownView>('overview');
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    onlineCount: 0,
    inAssessmentCount: 0,
    completedAttempts: 0,
    totalViolations: 0,
    recentLogs: [],
  });
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Drilldown Datasets
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [onlineList, setOnlineList] = useState<any[]>([]);
  const [activeAttemptsList, setActiveAttemptsList] = useState<any[]>([]);
  const [completedList, setCompletedList] = useState<any[]>([]);
  const [violationsList, setViolationsList] = useState<any[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);

  // Modal / Drawer Selection
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [profileInitialTab, setProfileInitialTab] = useState<'overview' | 'assessments' | 'questions' | 'security' | 'timeline'>('overview');
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Handle URL sync on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const initialView = params.get('view') as DrillDownView;
      if (initialView && ['students', 'online', 'in_assessment', 'completed', 'violations'].includes(initialView)) {
        setView(initialView);
      }
    }
  }, []);

  const changeView = (newView: DrillDownView) => {
    setView(newView);
    setSearchQuery('');
    setDeptFilter('all');
    setYearFilter('all');
    setStatusFilter('all');
    setSeverityFilter('all');

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (newView === 'overview') {
        url.searchParams.delete('view');
      } else {
        url.searchParams.set('view', newView);
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Fetch Drilldown Data
  const fetchDrilldownData = useCallback(async (currentView: DrillDownView) => {
    if (currentView === 'overview') return;
    setDrillLoading(true);
    try {
      if (currentView === 'students') {
        const res = await fetch('/api/admin/students');
        const json = await res.json();
        if (json.success && Array.isArray(json.students)) {
          setStudentsList(json.students);
        }
      } else if (currentView === 'online') {
        const res = await fetch('/api/admin/monitor/online');
        const json = await res.json();
        if (json.success && Array.isArray(json.students)) {
          setOnlineList(json.students);
        }
      } else if (currentView === 'in_assessment') {
        const res = await fetch('/api/admin/monitor/active-attempts');
        const json = await res.json();
        if (json.success && Array.isArray(json.attempts)) {
          setActiveAttemptsList(json.attempts);
        }
      } else if (currentView === 'completed') {
        const res = await fetch('/api/admin/results/completed');
        const json = await res.json();
        if (json.success && Array.isArray(json.attempts)) {
          setCompletedList(json.attempts);
        }
      } else if (currentView === 'violations') {
        const res = await fetch('/api/admin/security/events?limit=200');
        const json = await res.json();
        if (json.success && Array.isArray(json.events)) {
          setViolationsList(json.events);
        }
      }
    } catch (err) {
      console.warn('Drilldown fetch error:', err);
    } finally {
      setDrillLoading(false);
    }
  }, []);

  // Fetch general stats + active view data
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [statsRes, assessRes] = await Promise.all([
        fetch('/api/admin/dashboard-stats'),
        fetch('/api/admin/assessments'),
      ]);
      const statsJson = await statsRes.json();
      const assessJson = await assessRes.json();

      if (statsJson.success && statsJson.stats) {
        setStats(statsJson.stats);
      }
      if (assessJson.success && Array.isArray(assessJson.assessments)) {
        setAssessments(assessJson.assessments);
      }

      if (view !== 'overview') {
        await fetchDrilldownData(view);
      }
    } catch (err) {
      console.warn('Dashboard load error:', err);
    } finally {
      if (!silent) setRefreshing(false);
      setLoading(false);
    }
  }, [view, fetchDrilldownData]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [loadData]);

  // When view changes, fetch corresponding data immediately
  useEffect(() => {
    if (view !== 'overview') {
      fetchDrilldownData(view);
    }
  }, [view, fetchDrilldownData]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    let list = [...studentsList];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.full_name?.toLowerCase().includes(q) ||
          s.register_number?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q)
      );
    }
    if (deptFilter !== 'all') {
      list = list.filter((s) => s.department?.toUpperCase() === deptFilter.toUpperCase());
    }
    if (yearFilter !== 'all') {
      list = list.filter((s) => String(s.year) === yearFilter);
    }
    if (statusFilter !== 'all') {
      if (statusFilter === 'active' || statusFilter === 'inactive' || statusFilter === 'archived') {
        list = list.filter((s) => s.status === statusFilter || (statusFilter === 'archived' && s.is_archived));
      } else {
        list = list.filter((s) => s.online_status === statusFilter);
      }
    }

    list.sort((a, b) => {
      if (sortBy === 'name') {
        const cmp = (a.full_name || '').localeCompare(b.full_name || '');
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'regNo') {
        const cmp = (a.register_number || '').localeCompare(b.register_number || '');
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'score') {
        const sa = a.average_score || 0;
        const sb = b.average_score || 0;
        return sortOrder === 'asc' ? sa - sb : sb - sa;
      }
      if (sortBy === 'lastActive') {
        const ta = a.last_active ? new Date(a.last_active).getTime() : 0;
        const tb = b.last_active ? new Date(b.last_active).getTime() : 0;
        return sortOrder === 'asc' ? ta - tb : tb - ta;
      }
      return 0;
    });

    return list;
  }, [studentsList, searchQuery, deptFilter, yearFilter, statusFilter, sortBy, sortOrder]);

  // Filtered Online
  const filteredOnline = useMemo(() => {
    let list = [...onlineList];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.student_name?.toLowerCase().includes(q) ||
          s.register_number?.toLowerCase().includes(q)
      );
    }
    if (deptFilter !== 'all') {
      list = list.filter((s) => s.department?.toUpperCase() === deptFilter.toUpperCase());
    }
    if (yearFilter !== 'all') {
      list = list.filter((s) => String(s.year) === yearFilter);
    }
    if (statusFilter !== 'all') {
      list = list.filter((s) => s.status === statusFilter);
    }
    return list;
  }, [onlineList, searchQuery, deptFilter, yearFilter, statusFilter]);

  // Filtered Active Attempts
  const filteredActiveAttempts = useMemo(() => {
    let list = [...activeAttemptsList];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.student_name?.toLowerCase().includes(q) ||
          a.register_number?.toLowerCase().includes(q) ||
          a.test_title?.toLowerCase().includes(q) ||
          a.test_code?.toLowerCase().includes(q)
      );
    }
    if (deptFilter !== 'all') {
      list = list.filter((a) => a.department?.toUpperCase() === deptFilter.toUpperCase());
    }
    if (yearFilter !== 'all') {
      list = list.filter((a) => String(a.year) === yearFilter);
    }
    return list;
  }, [activeAttemptsList, searchQuery, deptFilter, yearFilter]);

  // Filtered Completed
  const filteredCompleted = useMemo(() => {
    let list = [...completedList];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.student_name?.toLowerCase().includes(q) ||
          a.register_number?.toLowerCase().includes(q) ||
          a.test_title?.toLowerCase().includes(q)
      );
    }
    if (deptFilter !== 'all') {
      list = list.filter((a) => a.department?.toUpperCase() === deptFilter.toUpperCase());
    }
    if (yearFilter !== 'all') {
      list = list.filter((a) => String(a.year) === yearFilter);
    }
    if (statusFilter !== 'all') {
      list = list.filter((a) => a.result_status?.toLowerCase() === statusFilter.toLowerCase());
    }
    return list;
  }, [completedList, searchQuery, deptFilter, yearFilter, statusFilter]);

  // Filtered Violations
  const filteredViolations = useMemo(() => {
    let list = [...violationsList];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (v) =>
          v.student_name?.toLowerCase().includes(q) ||
          v.register_number?.toLowerCase().includes(q) ||
          v.test_title?.toLowerCase().includes(q) ||
          v.event_type?.toLowerCase().includes(q) ||
          v.details?.toLowerCase().includes(q)
      );
    }
    if (severityFilter !== 'all') {
      list = list.filter((v) => v.severity === severityFilter);
    }
    if (statusFilter !== 'all') {
      list = list.filter((v) => v.event_type === statusFilter);
    }
    return list;
  }, [violationsList, searchQuery, severityFilter, statusFilter]);

  const liveAssessments = assessments.filter((a) => a.status === 'live');

  const formatSeconds = (sec?: number | null) => {
    if (sec === null || sec === undefined || sec < 0) return '—';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  const formatRelativeTime = (timeStr?: string | null) => {
    if (!timeStr) return 'Never';
    const ms = new Date(timeStr).getTime();
    if (isNaN(ms)) return '—';
    const diffSec = Math.floor((Date.now() - ms) / 1000);
    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return new Date(timeStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
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
              Click any dashboard summary card below to inspect full candidate records, active telemetry, and proctoring audit trails.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => loadData(false)}
            className="p-2.5 bg-white hover:bg-slate-50 rounded-xl text-slate-600 border border-slate-200 shadow-xs transition"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing || drillLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
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

      {/* Main KPI Statistics Grid — Interactive Drill-Down Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {/* Card 1: Total Students */}
        <div
          onClick={() => changeView(view === 'students' ? 'overview' : 'students')}
          className={`group rounded-2xl p-5 border transition-all cursor-pointer select-none relative ${
            view === 'students'
              ? 'bg-indigo-50/50 border-indigo-500 ring-2 ring-indigo-500 shadow-md shadow-indigo-500/10'
              : 'bg-white/90 backdrop-blur-xl border-slate-200/90 shadow-sm shadow-slate-900/5 hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-indigo-600 transition">
              Total Students
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
              view === 'students' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 border border-indigo-200/60 text-indigo-600'
            }`}>
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.totalStudents}</div>
          <div className="flex items-center justify-between mt-1 text-[11px]">
            <span className="text-slate-500">Registered in Turso</span>
            <span className="text-indigo-600 font-semibold group-hover:translate-x-0.5 transition flex items-center gap-0.5">
              {view === 'students' ? 'Active' : 'Details →'}
            </span>
          </div>
        </div>

        {/* Card 2: Online Now */}
        <div
          onClick={() => changeView(view === 'online' ? 'overview' : 'online')}
          className={`group rounded-2xl p-5 border transition-all cursor-pointer select-none relative ${
            view === 'online'
              ? 'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500 shadow-md shadow-emerald-500/10'
              : 'bg-white/90 backdrop-blur-xl border-slate-200/90 shadow-sm shadow-slate-900/5 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-emerald-600 transition">
              Online Now
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
              view === 'online' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 border border-emerald-200/60'
            }`}>
              <span className={`w-2.5 h-2.5 rounded-full ${view === 'online' ? 'bg-white' : 'bg-emerald-500 animate-pulse'}`} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">{stats.onlineCount}</div>
          <div className="flex items-center justify-between mt-1 text-[11px]">
            <span className="text-slate-500">Active heartbeats</span>
            <span className="text-emerald-600 font-semibold group-hover:translate-x-0.5 transition flex items-center gap-0.5">
              {view === 'online' ? 'Active' : 'Live →'}
            </span>
          </div>
        </div>

        {/* Card 3: In Assessment */}
        <div
          onClick={() => changeView(view === 'in_assessment' ? 'overview' : 'in_assessment')}
          className={`group rounded-2xl p-5 border transition-all cursor-pointer select-none relative ${
            view === 'in_assessment'
              ? 'bg-blue-50/50 border-blue-500 ring-2 ring-blue-500 shadow-md shadow-blue-500/10'
              : 'bg-white/90 backdrop-blur-xl border-slate-200/90 shadow-sm shadow-slate-900/5 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-blue-600 transition">
              In Assessment
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
              view === 'in_assessment' ? 'bg-blue-600 text-white' : 'bg-blue-50 border border-blue-200/60 text-blue-600'
            }`}>
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600">{stats.inAssessmentCount}</div>
          <div className="flex items-center justify-between mt-1 text-[11px]">
            <span className="text-slate-500">Attempting tests</span>
            <span className="text-blue-600 font-semibold group-hover:translate-x-0.5 transition flex items-center gap-0.5">
              {view === 'in_assessment' ? 'Active' : 'Invigilate →'}
            </span>
          </div>
        </div>

        {/* Card 4: Completed Attempts */}
        <div
          onClick={() => changeView(view === 'completed' ? 'overview' : 'completed')}
          className={`group rounded-2xl p-5 border transition-all cursor-pointer select-none relative ${
            view === 'completed'
              ? 'bg-purple-50/50 border-purple-500 ring-2 ring-purple-500 shadow-md shadow-purple-500/10'
              : 'bg-white/90 backdrop-blur-xl border-slate-200/90 shadow-sm shadow-slate-900/5 hover:border-purple-300 hover:shadow-md hover:-translate-y-0.5'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-purple-600 transition">
              Completed
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
              view === 'completed' ? 'bg-purple-600 text-white' : 'bg-purple-50 border border-purple-200/60 text-purple-600'
            }`}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-600">{stats.completedAttempts}</div>
          <div className="flex items-center justify-between mt-1 text-[11px]">
            <span className="text-slate-500">Finalized submissions</span>
            <span className="text-purple-600 font-semibold group-hover:translate-x-0.5 transition flex items-center gap-0.5">
              {view === 'completed' ? 'Active' : 'Results →'}
            </span>
          </div>
        </div>

        {/* Card 5: Security Violations */}
        <div
          onClick={() => changeView(view === 'violations' ? 'overview' : 'violations')}
          className={`group rounded-2xl p-5 border transition-all cursor-pointer select-none relative ${
            view === 'violations'
              ? 'bg-rose-50/50 border-rose-500 ring-2 ring-rose-500 shadow-md shadow-rose-500/10'
              : 'bg-white/90 backdrop-blur-xl border-slate-200/90 shadow-sm shadow-slate-900/5 hover:border-rose-300 hover:shadow-md hover:-translate-y-0.5'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-rose-600 transition">
              Violations
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
              view === 'violations' ? 'bg-rose-600 text-white' : 'bg-rose-50 border border-rose-200/60 text-rose-600'
            }`}>
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600">{stats.totalViolations}</div>
          <div className="flex items-center justify-between mt-1 text-[11px]">
            <span className="text-rose-500">Security anomalies</span>
            <span className="text-rose-600 font-semibold group-hover:translate-x-0.5 transition flex items-center gap-0.5">
              {view === 'violations' ? 'Active' : 'Audit →'}
            </span>
          </div>
        </div>
      </div>

      {/* DRILL-DOWN PANEL (Rendered when a card is selected) */}
      {view !== 'overview' && (
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 space-y-6 border border-slate-200 shadow-sm animate-in fade-in duration-200">
          {/* Drill-down Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => changeView('overview')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Overview</span>
                </button>
                <div className="h-4 w-px bg-slate-200" />
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  {view === 'students' && (
                    <>
                      <Users className="w-5 h-5 text-indigo-600" />
                      <span>Student Management Directory</span>
                    </>
                  )}
                  {view === 'online' && (
                    <>
                      <Radio className="w-5 h-5 text-emerald-600 animate-pulse" />
                      <span>Live Online Candidates</span>
                    </>
                  )}
                  {view === 'in_assessment' && (
                    <>
                      <Activity className="w-5 h-5 text-blue-600" />
                      <span>Active Assessment Invigilation</span>
                    </>
                  )}
                  {view === 'completed' && (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-purple-600" />
                      <span>Completed Examinations & Scorecards</span>
                    </>
                  )}
                  {view === 'violations' && (
                    <>
                      <ShieldAlert className="w-5 h-5 text-rose-600" />
                      <span>Security & Proctoring Anomaly Audit</span>
                    </>
                  )}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                  {view === 'students' && `${filteredStudents.length} Students`}
                  {view === 'online' && `${filteredOnline.length} Active`}
                  {view === 'in_assessment' && `${filteredActiveAttempts.length} Attempts`}
                  {view === 'completed' && `${filteredCompleted.length} Finalized`}
                  {view === 'violations' && `${filteredViolations.length} Events`}
                </span>
              </div>
              <p className="text-xs text-slate-500 pl-0.5">
                {view === 'students' && 'Click any candidate row to inspect their 5-tab profile, assessment history, code submissions, and proctoring logs.'}
                {view === 'online' && 'Real-time telemetry of currently connected candidates transmitting periodic server-side heartbeats (< 90 seconds).'}
                {view === 'in_assessment' && 'Authoritative active test attempts currently running with server-enforced deadline timers.'}
                {view === 'completed' && 'Finalized assessment attempts. Click any row to review complete evaluation results, code, and test cases.'}
                {view === 'violations' && 'Comprehensive security log of tab switches, fullscreen escapes, copy-paste attempts, and proctoring deterrents.'}
              </p>
            </div>

            {/* View Switcher Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl self-start md:self-auto overflow-x-auto max-w-full">
              <button
                onClick={() => changeView('students')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  view === 'students' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Students ({stats.totalStudents})
              </button>
              <button
                onClick={() => changeView('online')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  view === 'online' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Online ({stats.onlineCount})
              </button>
              <button
                onClick={() => changeView('in_assessment')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  view === 'in_assessment' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                In Assessment ({stats.inAssessmentCount})
              </button>
              <button
                onClick={() => changeView('completed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  view === 'completed' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Completed ({stats.completedAttempts})
              </button>
              <button
                onClick={() => changeView('violations')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  view === 'violations' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Violations ({stats.totalViolations})
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={
                  view === 'students'
                    ? 'Search by student name or register number...'
                    : view === 'violations'
                    ? 'Search violations by candidate, event, or test...'
                    : 'Search candidate or assessment...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Dept filter (for students, online, in_assessment, completed) */}
              {view !== 'violations' && (
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">All Departments</option>
                  <option value="AD">AI & Data Science (AD)</option>
                  <option value="CSE">Computer Science (CSE)</option>
                  <option value="ECE">Electronics (ECE)</option>
                  <option value="EEE">Electrical (EEE)</option>
                  <option value="MECH">Mechanical (MECH)</option>
                  <option value="CIVIL">Civil (CIVIL)</option>
                </select>
              )}

              {/* Year Filter */}
              {view !== 'violations' && (
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">All Years</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4</option>
                </select>
              )}

              {/* Status Filter for Students */}
              {view === 'students' && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">All Statuses</option>
                  <option value="ONLINE">Online</option>
                  <option value="IN_ASSESSMENT">In Assessment</option>
                  <option value="IDLE">Idle</option>
                  <option value="OFFLINE">Offline</option>
                  <option value="active">Active Accounts</option>
                  <option value="archived">Archived Accounts</option>
                </select>
              )}

              {/* Status Filter for Completed */}
              {view === 'completed' && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">All Results</option>
                  <option value="passed">Passed Only</option>
                  <option value="failed">Failed Only</option>
                </select>
              )}

              {/* Severity Filter for Violations */}
              {view === 'violations' && (
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">All Severities</option>
                  <option value="HIGH">High Severity</option>
                  <option value="MEDIUM">Medium Severity</option>
                  <option value="LOW">Low Severity</option>
                </select>
              )}

              {/* Event Type Filter for Violations */}
              {view === 'violations' && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">All Event Types</option>
                  <option value="FULLSCREEN_EXIT">Fullscreen Exit</option>
                  <option value="TAB_SWITCH">Tab Switch</option>
                  <option value="COPY_ATTEMPT">Copy Attempt</option>
                  <option value="PASTE_ATTEMPT">Paste Attempt</option>
                  <option value="CUT_ATTEMPT">Cut Attempt</option>
                  <option value="WARNING_TRIGGERED">Warning Triggered</option>
                </select>
              )}

              {/* Sort selector for students */}
              {view === 'students' && (
                <div className="flex items-center gap-1">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="name">Sort by Name</option>
                    <option value="regNo">Sort by Reg No</option>
                    <option value="lastActive">Sort by Last Active</option>
                    <option value="score">Sort by Avg Score</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
                    title={`Sort Order: ${sortOrder.toUpperCase()}`}
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <div className="overflow-x-auto border border-slate-200/80 rounded-2xl shadow-xs">
            {/* VIEW 1: TOTAL STUDENTS TABLE */}
            {view === 'students' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Student Details</th>
                    <th className="py-3 px-3">Register Number</th>
                    <th className="py-3 px-3">Dept & Year</th>
                    <th className="py-3 px-3">Account</th>
                    <th className="py-3 px-3">Live Presence</th>
                    <th className="py-3 px-3">Current Assessment</th>
                    <th className="py-3 px-3">Last Active</th>
                    <th className="py-3 px-3 text-center">Completed</th>
                    <th className="py-3 px-3 text-center">Avg Score</th>
                    <th className="py-3 px-3 text-center">Violations</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((s) => (
                      <tr
                        key={s.id}
                        onClick={() => {
                          setSelectedStudentId(s.id);
                          setProfileInitialTab('overview');
                        }}
                        className="hover:bg-indigo-50/40 transition cursor-pointer group"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                              {s.full_name?.charAt(0)?.toUpperCase() || 'S'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition">
                                {s.full_name}
                              </div>
                              <div className="text-[11px] text-slate-400">{s.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-indigo-700">
                          {s.register_number}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-700">{s.department}</span>
                          <span className="text-slate-400 block text-[11px]">Year {s.year} • Sec {s.section || 'A'}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            s.is_archived
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : s.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {s.is_archived ? 'Archived' : s.status || 'Active'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            s.online_status === 'ONLINE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : s.online_status === 'IN_ASSESSMENT'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : s.online_status === 'IDLE'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              s.online_status === 'ONLINE'
                                ? 'bg-emerald-500 animate-pulse'
                                : s.online_status === 'IN_ASSESSMENT'
                                ? 'bg-blue-500'
                                : s.online_status === 'IDLE'
                                ? 'bg-amber-500'
                                : 'bg-slate-400'
                            }`} />
                            {s.online_status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {s.current_assessment ? (
                            <div>
                              <div className="font-semibold text-slate-800 truncate max-w-[140px]">{s.current_assessment}</div>
                              <span className="text-[10px] text-blue-600 font-mono capitalize">{s.assessment_status || 'In Progress'}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-600 text-[11px]">
                          {formatRelativeTime(s.last_active)}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-800">
                          {s.completed_count || 0}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-bold text-indigo-700 font-mono">
                            {s.average_score !== undefined && s.average_score !== null ? `${s.average_score}%` : '—'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {Number(s.violations || 0) > 0 ? (
                            <span className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 font-bold rounded-full text-[10px]">
                              {s.violations}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">0</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudentId(s.id);
                              setProfileInitialTab('overview');
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition inline-flex items-center gap-1"
                          >
                            <span>Profile</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} className="py-12 text-center">
                        <EmptyState
                          title="No students match criteria"
                          description="Try modifying search keywords or clearing applied department/year filters."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {/* VIEW 2: ONLINE NOW CANDIDATES TABLE */}
            {view === 'online' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-3">Register Number</th>
                    <th className="py-3 px-3">Dept & Year</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Current Assessment</th>
                    <th className="py-3 px-3">Question & Progress</th>
                    <th className="py-3 px-3">Time Remaining</th>
                    <th className="py-3 px-3">Last Heartbeat</th>
                    <th className="py-3 px-3 text-center">Warnings</th>
                    <th className="py-3 px-3">Fullscreen</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredOnline.length > 0 ? (
                    filteredOnline.map((s) => (
                      <tr
                        key={s.student_id}
                        onClick={() => {
                          setSelectedStudentId(s.student_id);
                          setProfileInitialTab('overview');
                        }}
                        className="hover:bg-emerald-50/30 transition cursor-pointer group"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold flex items-center justify-center shrink-0">
                              {s.student_name?.charAt(0)?.toUpperCase() || 'S'}
                            </div>
                            <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition">
                              {s.student_name}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-indigo-700">
                          {s.register_number}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-700">{s.department}</span>
                          <span className="text-slate-400 block text-[11px]">Year {s.year} (Sec {s.section || 'A'})</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            s.status === 'ONLINE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : s.status === 'IN_ASSESSMENT'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : s.status === 'WARNING'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              s.status === 'ONLINE' || s.status === 'IN_ASSESSMENT' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                            }`} />
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {s.current_assessment_id ? (
                            <span className="font-mono text-slate-800 text-[11px] bg-slate-100 px-2 py-0.5 rounded-md">
                              {s.current_assessment_id}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 min-w-[130px]">
                          {s.current_assessment_id ? (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-slate-700">{s.current_question}</span>
                                <span className="font-bold text-emerald-600">{s.progress_percent}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-1.5 rounded-full transition-all"
                                  style={{ width: `${s.progress_percent}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-slate-700 text-[11px]">
                          {s.time_remaining_seconds !== null ? (
                            <span className="text-indigo-600 font-bold">{formatSeconds(s.time_remaining_seconds)}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                          {s.last_heartbeat_seconds}s ago
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            Number(s.violation_count || 0) > 0
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {s.violation_count || 0} / 3
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            s.fullscreen_status === 'Exited Fullscreen'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {s.fullscreen_status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href="/admin/monitor"
                              onClick={(e) => e.stopPropagation()}
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            >
                              Monitor
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} className="py-12 text-center">
                        <EmptyState
                          title="No candidates currently connected"
                          description="Candidates transmitting live heartbeats during testing will display here automatically."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {/* VIEW 3: IN ASSESSMENT ACTIVE ATTEMPTS TABLE */}
            {view === 'in_assessment' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Candidate</th>
                    <th className="py-3 px-3">Register Number</th>
                    <th className="py-3 px-3">Assessment</th>
                    <th className="py-3 px-3">Year</th>
                    <th className="py-3 px-3">Started At</th>
                    <th className="py-3 px-3">Ends At (Deadline)</th>
                    <th className="py-3 px-3">Time Remaining</th>
                    <th className="py-3 px-3">Completed Qs</th>
                    <th className="py-3 px-3">Progress</th>
                    <th className="py-3 px-3 text-center">Score</th>
                    <th className="py-3 px-3 text-center">Warnings</th>
                    <th className="py-3 px-3 text-center">Tab Switches</th>
                    <th className="py-3 px-3 text-right">Invigilation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredActiveAttempts.length > 0 ? (
                    filteredActiveAttempts.map((a) => (
                      <tr
                        key={a.attempt_id}
                        onClick={() => {
                          setSelectedStudentId(a.student_id);
                          setProfileInitialTab('assessments');
                        }}
                        className="hover:bg-blue-50/30 transition cursor-pointer group"
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 group-hover:text-blue-600 transition">
                            {a.student_name}
                          </div>
                          <div className="text-[11px] text-slate-400">{a.department}</div>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-indigo-700">
                          {a.register_number}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">{a.test_title}</div>
                          {a.test_code && (
                            <span className="text-[10px] font-mono text-slate-400">Code: {a.test_code}</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold text-[10px]">
                            Year {a.year}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                          {a.started_at ? new Date(a.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {a.ends_at ? new Date(a.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-blue-600 text-[11px]">
                          {formatSeconds(a.time_remaining_seconds)}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700 text-[11px]">
                          {a.questions_completed} of {a.total_questions}
                        </td>
                        <td className="py-3 px-3 min-w-[100px]">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-blue-600">{a.progress_percent}%</span>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-blue-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${a.progress_percent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-900 font-mono">
                          {a.current_score || 0}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            Number(a.warning_count || 0) > 0
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {Math.min(3, Number(a.warning_count || 0))} / 3
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-600">
                          {a.tab_switches || 0}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            href={`/admin/monitor`}
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                          >
                            Live View →
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={13} className="py-12 text-center">
                        <EmptyState
                          title="No active assessments in progress"
                          description="Currently, no candidates are taking an examination under active countdown deadlines."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {/* VIEW 4: COMPLETED ATTEMPTS & SCORECARDS TABLE */}
            {view === 'completed' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Candidate</th>
                    <th className="py-3 px-3">Register Number</th>
                    <th className="py-3 px-3">Assessment</th>
                    <th className="py-3 px-3">Year</th>
                    <th className="py-3 px-3">Completed At</th>
                    <th className="py-3 px-3">Time Taken</th>
                    <th className="py-3 px-3 text-center">Score</th>
                    <th className="py-3 px-3 text-center">Percentage</th>
                    <th className="py-3 px-3 text-center">Result</th>
                    <th className="py-3 px-3 text-center">Rank</th>
                    <th className="py-3 px-3 text-center">Violations</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredCompleted.length > 0 ? (
                    filteredCompleted.map((a) => (
                      <tr
                        key={a.attempt_id}
                        onClick={() => setSelectedAttemptId(a.attempt_id)}
                        className="hover:bg-purple-50/30 transition cursor-pointer group"
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 group-hover:text-purple-600 transition">
                            {a.student_name}
                          </div>
                          <div className="text-[11px] text-slate-400">{a.department}</div>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-indigo-700">
                          {a.register_number}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">{a.test_title}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold text-[10px]">
                            Year {a.year}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                          {a.completed_at ? new Date(a.completed_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700 font-semibold text-[11px]">
                          {formatSeconds(a.time_taken_seconds)}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-900 font-mono">
                          {a.score} pts
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-bold text-purple-700 font-mono text-sm">
                            {a.percentage}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            a.result_status === 'Passed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {a.result_status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-bold font-mono text-[10px]">
                            #{a.rank}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {Number(a.violation_count || 0) > 0 ? (
                            <span className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 font-bold rounded-full text-[10px]">
                              {a.violation_count}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">0</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAttemptId(a.attempt_id);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Scorecard</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={12} className="py-12 text-center">
                        <EmptyState
                          title="No completed assessments yet"
                          description="Finalized candidate submissions and evaluations will be recorded here automatically."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {/* VIEW 5: SECURITY VIOLATIONS AUDIT TABLE */}
            {view === 'violations' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Candidate</th>
                    <th className="py-3 px-3">Register Number</th>
                    <th className="py-3 px-3">Assessment</th>
                    <th className="py-3 px-3">Security Anomaly</th>
                    <th className="py-3 px-3">Timestamp</th>
                    <th className="py-3 px-3 text-center">Severity</th>
                    <th className="py-3 px-3 text-center">Warning Counter</th>
                    <th className="py-3 px-3">Question Context</th>
                    <th className="py-3 px-3">Audit Details</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredViolations.length > 0 ? (
                    filteredViolations.map((v) => (
                      <tr
                        key={v.id}
                        onClick={() => {
                          setSelectedStudentId(v.student_id);
                          setProfileInitialTab('security');
                        }}
                        className="hover:bg-rose-50/30 transition cursor-pointer group"
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 group-hover:text-rose-600 transition">
                            {v.student_name}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-indigo-700">
                          {v.register_number}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {v.test_title || 'Active Assessment'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-mono font-bold text-[10px] uppercase">
                            {v.event_type}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                          {v.event_time ? new Date(v.event_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            v.severity === 'HIGH'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : v.severity === 'MEDIUM'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {v.severity}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Warning {v.warning_number} of 3
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 text-[11px]">
                          {v.question || 'General Session'}
                        </td>
                        <td className="py-3 px-3 text-slate-600 max-w-[200px] truncate text-[11px]" title={v.details}>
                          {v.details}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudentId(v.student_id);
                              setProfileInitialTab('security');
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="py-12 text-center">
                        <EmptyState
                          title="No security anomalies recorded"
                          description="Proctoring events, tab switches, and security deterrent warnings will be cataloged here."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Middle Section: Live Assessments & Live Event Feed (Shown in Overview Mode) */}
      {view === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
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
              <div className="space-y-4">
                {liveAssessments.map((t) => (
                  <div key={t.id} className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-lg font-bold text-slate-900">{t.title}</h4>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{t.description}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[10px] uppercase">
                        LIVE
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-xs font-mono bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                      <div>
                        <span className="text-slate-500 block mb-1 text-[11px] uppercase tracking-wider font-semibold">Duration</span>
                        <span className="font-bold text-slate-900">{t.duration} Mins</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-1 text-[11px] uppercase tracking-wider font-semibold">Questions</span>
                        <span className="font-bold text-emerald-600">{t.question_count} Problems</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-1 text-[11px] uppercase tracking-wider font-semibold">Participants</span>
                        <span className="font-bold text-indigo-600 block">{t.participant_count} Attempts</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Link
                        href="/admin/monitor"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition shadow-sm shadow-indigo-600/20"
                      >
                        Invigilate Candidates
                      </Link>
                      <span className="font-mono text-[11px] text-slate-400">Code: {t.code || t.id.slice(0, 8)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No active examination right now"
                description="Scheduled examinations can be published or started from the Assessments management console."
                action={{
                  label: "Create or Publish Assessment",
                  href: "/admin/tests",
                }}
              />
            )}
          </div>

          {/* Live Streaming Activity Feed */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-7 space-y-5 border border-slate-200/90 shadow-sm shadow-slate-900/5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                <span>Live Audit Stream</span>
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono font-semibold">
                Turso Sync
              </span>
            </div>

            {stats.recentLogs && stats.recentLogs.length > 0 ? (
              <div className="space-y-3 font-mono text-xs max-h-96 overflow-y-auto pr-1">
                {stats.recentLogs.map((l) => (
                  <div
                    key={l.id}
                    onClick={() => changeView('violations')}
                    className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-1 hover:border-slate-300 transition cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-[11px] truncate max-w-[150px] group-hover:text-indigo-600 transition">
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
      )}

      {/* 5-TAB STUDENT PROFILE DRAWER */}
      {selectedStudentId && (
        <StudentProfileDrawer
          studentId={selectedStudentId}
          initialTab={profileInitialTab}
          onClose={() => setSelectedStudentId(null)}
          onSelectAttempt={(attId) => setSelectedAttemptId(attId)}
        />
      )}

      {/* COMPLETED ATTEMPT SCORECARD MODAL */}
      {selectedAttemptId && (
        <CompletedAttemptModal
          attemptId={selectedAttemptId}
          onClose={() => setSelectedAttemptId(null)}
        />
      )}
    </div>
  );
}
