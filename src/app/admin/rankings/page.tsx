'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Award,
  Trophy,
  Medal,
  Clock,
  Download,
  Search,
  Filter,
  RefreshCw,
  Users,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  GraduationCap,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { exportToCsv } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { StudentProfileDrawer } from '@/components/admin/StudentProfileDrawer';

interface RankingRecord {
  rank: number;
  attempt_id: string;
  student_id: string;
  student_name: string;
  register_number: string;
  department: string;
  year: number;
  test_id: string;
  test_title: string;
  test_type: string;
  score: number;
  max_score: number;
  percentage: number;
  time_taken_seconds: number;
  time_taken_display: string;
  status: string;
  start_time: string;
  end_time?: string | null;
  violation_count: number;
  termination_reason?: string | null;
  total_questions: number;
  attempted_questions: number;
}

interface AssessmentOption {
  id: string;
  title: string;
  code?: string;
  year?: number;
  test_type?: string;
}

export default function AdminRankingsPage() {
  const [rankings, setRankings] = useState<RankingRecord[]>([]);
  const [assessments, setAssessments] = useState<AssessmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedTestId, setSelectedTestId] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected student for Profile Drawer
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Load assessments for filter dropdown
  useEffect(() => {
    async function loadAssessments() {
      try {
        const res = await fetch('/api/admin/assessments');
        const json = await res.json();
        if (json.success && Array.isArray(json.assessments)) {
          setAssessments(json.assessments);
        }
      } catch (err) {
        console.warn('Failed to load assessments for ranking filter:', err);
      }
    }
    loadAssessments();
  }, []);

  // Fetch server-calculated rankings
  const fetchRankings = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (selectedTestId && selectedTestId !== 'all') {
        params.set('testId', selectedTestId);
      }
      if (selectedYear && selectedYear !== 'all') {
        params.set('year', selectedYear);
      }
      if (selectedStatus && selectedStatus !== 'all') {
        params.set('status', selectedStatus);
      }
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }

      const res = await fetch(`/api/admin/rankings?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.rankings)) {
        setRankings(json.rankings);
      } else {
        setRankings([]);
      }
    } catch (err) {
      console.warn('Failed to fetch rankings:', err);
      setRankings([]);
    } finally {
      if (!silent) setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, [selectedTestId, selectedYear, selectedStatus, searchQuery]);

  // Derived Summary Statistics
  const topCandidate = rankings.length > 0 ? rankings[0] : null;
  const totalRanked = rankings.length;
  const completedRanked = rankings.filter(
    (r) => r.status === 'completed' || r.status === 'submitted' || r.status === 'auto_submitted'
  ).length;
  const avgScore =
    rankings.length > 0
      ? Math.round(rankings.reduce((sum, r) => sum + r.score, 0) / rankings.length)
      : 0;
  const avgPercentage =
    rankings.length > 0
      ? Math.round(rankings.reduce((sum, r) => sum + r.percentage, 0) / rankings.length)
      : 0;

  // CSV Export
  const handleExportCsv = () => {
    if (!rankings.length) return;

    const exportRows = rankings.map((r) => ({
      'Rank': `#${r.rank}`,
      'Student Name': r.student_name,
      'Register Number': r.register_number,
      'Department': r.department,
      'Year': `Year ${r.year}`,
      'Assessment': r.test_title,
      'Assessment Type': r.test_type.toUpperCase(),
      'Score': r.score,
      'Max Score': r.max_score,
      'Percentage': `${r.percentage}%`,
      'Time Taken': r.time_taken_display,
      'Questions Attempted': `${r.attempted_questions} / ${r.total_questions}`,
      'Status': r.status.toUpperCase(),
      'Proctoring Violations': r.violation_count,
      'Termination Reason': r.termination_reason || 'N/A',
      'Start Time': r.start_time ? new Date(r.start_time).toLocaleString() : 'N/A',
      'Completion Time': r.end_time ? new Date(r.end_time).toLocaleString() : 'In Progress',
    }));

    const dateStr = new Date().toISOString().split('T')[0];
    exportToCsv(`JIT_CodeArena_Rankings_${dateStr}`, exportRows);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm shadow-slate-900/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
            <Trophy className="w-3.5 h-3.5 text-amber-600" />
            <span>AUTHORITATIVE LEADERBOARD & PERFORMANCE RANKINGS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            First Completion Leaderboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
            Deterministic server-calculated standings ordered strictly by: Highest Score first, fastest completion duration for ties, earlier submission timestamp, and deterministic ID break.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchRankings(false)}
            disabled={refreshing}
            className="p-2.5 bg-white hover:bg-slate-50 rounded-xl text-slate-600 border border-slate-200 shadow-xs transition flex items-center gap-2 text-xs font-semibold"
            title="Refresh leaderboard data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={rankings.length === 0}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs ${
              rankings.length > 0
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-indigo-600/20'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Top Performer Card */}
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-white rounded-2xl p-5 border border-amber-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">Rank #1 Leader</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          {topCandidate ? (
            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-900 text-base truncate">{topCandidate.student_name}</h3>
              <div className="flex items-center gap-2 text-xs text-slate-600 font-mono">
                <span className="font-bold text-amber-700">{topCandidate.score}/{topCandidate.max_score} pts</span>
                <span>•</span>
                <span>{topCandidate.time_taken_display}</span>
              </div>
              <span className="text-[10px] text-slate-400 block truncate">{topCandidate.register_number} • {topCandidate.department}</span>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-2">No ranked attempts recorded yet.</p>
          )}
        </div>

        {/* Total Ranked Candidates */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Ranked</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{totalRanked}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {completedRanked} completed • {totalRanked - completedRanked} active/in-progress
          </span>
        </div>

        {/* Average Score */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Cohort Average</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">{avgScore} pts</div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Average accuracy: {avgPercentage}%
          </span>
        </div>

        {/* Fastest Completed Duration */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Top Time Record</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600">
            {topCandidate?.time_taken_display || '-'}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Earliest full-submission mark
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Assessment Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Assessment Filter
            </label>
            <select
              value={selectedTestId}
              onChange={(e) => setSelectedTestId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Assessments</option>
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} {a.year ? `(Year ${a.year})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Academic Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Academic Years</option>
              <option value="2">Year 2 (Sophomore)</option>
              <option value="3">Year 3 (Junior)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Attempt Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Valid Attempts</option>
              <option value="completed">Completed / Submitted</option>
              <option value="in_progress">In Progress</option>
              <option value="terminated">Terminated (Disqualified)</option>
            </select>
          </div>

          {/* Student Search */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Search Candidate
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name or roll no..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">{rankings.length}</span> candidates matched criteria
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Rankings reflect real-time database attempts. Submissions with zero unanswered questions rank higher.
          </span>
        </div>
      </div>

      {/* Main Leaderboard Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs font-medium text-slate-500">Calculating server rankings from Turso database...</p>
          </div>
        ) : rankings.length === 0 ? (
          <div className="py-16">
            <EmptyState
              title="No Leaderboard Records Found"
              description="No assessment attempts matched your selected filter criteria. Try adjusting the assessment or academic year filters."
              action={{
                label: 'Reset Filters',
                onClick: () => {
                  setSelectedTestId('all');
                  setSelectedYear('all');
                  setSelectedStatus('all');
                  setSearchQuery('');
                },
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 text-center w-16">Rank</th>
                  <th className="py-3.5 px-4">Candidate Information</th>
                  <th className="py-3.5 px-3">Dept & Year</th>
                  <th className="py-3.5 px-3">Assessment</th>
                  <th className="py-3.5 px-3 text-center">Score / Marks</th>
                  <th className="py-3.5 px-3 text-center">Percentage</th>
                  <th className="py-3.5 px-3 text-center">Time Taken</th>
                  <th className="py-3.5 px-3 text-center">Answered</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-3">Completed At</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {rankings.map((r) => {
                  const isTop1 = r.rank === 1;
                  const isTop2 = r.rank === 2;
                  const isTop3 = r.rank === 3;

                  return (
                    <tr
                      key={r.attempt_id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isTop1 ? 'bg-amber-50/30' : isTop2 ? 'bg-slate-50/30' : isTop3 ? 'bg-orange-50/20' : ''
                      }`}
                    >
                      {/* Rank Column */}
                      <td className="py-3.5 px-4 text-center">
                        {isTop1 ? (
                          <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-black shadow-xs" title="1st Place">
                            <Trophy className="w-4 h-4 text-amber-600" />
                          </div>
                        ) : isTop2 ? (
                          <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-slate-800 border border-slate-300 font-black shadow-xs" title="2nd Place">
                            <Medal className="w-4 h-4 text-slate-600" />
                          </div>
                        ) : isTop3 ? (
                          <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-900 border border-orange-300 font-black shadow-xs" title="3rd Place">
                            <Award className="w-4 h-4 text-orange-600" />
                          </div>
                        ) : (
                          <span className="font-mono font-bold text-slate-600 text-sm">
                            #{r.rank}
                          </span>
                        )}
                      </td>

                      {/* Student Info */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => setSelectedStudentId(r.student_id)}
                          className="text-left group cursor-pointer"
                        >
                          <span className="font-bold text-slate-900 block group-hover:text-indigo-600 group-hover:underline transition">
                            {r.student_name}
                          </span>
                          <span className="text-[11px] font-mono text-indigo-600 font-semibold block">
                            {r.register_number}
                          </span>
                        </button>
                      </td>

                      {/* Dept & Year */}
                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-slate-800 block">{r.department}</span>
                        <span className="text-[11px] text-slate-400">Year {r.year}</span>
                      </td>

                      {/* Assessment */}
                      <td className="py-3.5 px-3 max-w-[180px]">
                        <span className="font-semibold text-slate-800 block truncate" title={r.test_title}>
                          {r.test_title}
                        </span>
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-600">
                          {r.test_type}
                        </span>
                      </td>

                      {/* Score */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-mono font-black text-sm text-slate-900 block">
                          {r.score}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          / {r.max_score} pts
                        </span>
                      </td>

                      {/* Percentage */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-mono font-bold text-xs text-indigo-700">
                          {r.percentage}%
                        </span>
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              r.percentage >= 75 ? 'bg-emerald-500' : r.percentage >= 50 ? 'bg-indigo-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(5, r.percentage))}%` }}
                          />
                        </div>
                      </td>

                      {/* Time Taken */}
                      <td className="py-3.5 px-3 text-center font-mono font-semibold text-slate-700">
                        {r.time_taken_display}
                      </td>

                      {/* Answered Questions */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`font-mono text-xs font-bold ${
                          r.attempted_questions >= r.total_questions ? 'text-emerald-700' : 'text-amber-700'
                        }`}>
                          {r.attempted_questions} / {r.total_questions}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        {r.status === 'terminated' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200" title={r.termination_reason || 'Disqualified'}>
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            Terminated
                          </span>
                        ) : r.status === 'completed' || r.status === 'submitted' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Completed
                          </span>
                        ) : r.status === 'auto_submitted' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-purple-50 text-purple-700 border border-purple-200">
                            <Clock className="w-3 h-3 text-purple-600" />
                            Auto-Sub
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            In Progress
                          </span>
                        )}
                      </td>

                      {/* Completed At */}
                      <td className="py-3.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {r.end_time ? new Date(r.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedStudentId(r.student_id)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-semibold rounded-lg text-xs transition border border-slate-200 cursor-pointer"
                        >
                          Profile
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Profile Drawer */}
      <StudentProfileDrawer
        studentId={selectedStudentId}
        onClose={() => setSelectedStudentId(null)}
      />
    </div>
  );
}
