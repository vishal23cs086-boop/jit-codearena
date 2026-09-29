'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { exportToCsv, exportSectionsToCsv, exportSectionsToExcel } from '@/lib/utils';
import { StudentProfileDrawer } from '@/components/admin/StudentProfileDrawer';
import {
  FileSpreadsheet,
  Download,
  FileText,
  ShieldAlert,
  Users,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Filter,
  Search,
  Printer,
  X,
  AlertTriangle,
  Award,
  Clock,
  ArrowUpDown,
  Building,
  GraduationCap,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface ReportRow {
  id: string;
  student_id: string;
  attempt_id: string | null;
  register_number: string;
  name: string;
  department: string;
  year: number;
  section: string;
  email: string;
  phone: string;
  assessment: string;
  test_id: string | null;
  score: number | null;
  total_marks: number;
  percentage: number | null;
  time_taken_seconds: number;
  time_taken_formatted: string;
  violations: number;
  tab_switches: number;
  fullscreen_exits: number;
  status: 'COMPLETED' | 'IN PROGRESS' | 'NOT STARTED' | 'TERMINATED';
  started_at: string | null;
  completed_at: string | null;
  completion_time: string;
  rank: number | string;
  question_results?: any;
}

interface TestItem {
  id: string;
  title: string;
  year: number;
  duration: number;
  total_marks: number;
  passing_marks: number;
  status: string;
}

interface MatrixData {
  year2: { cse: number; csbs: number; aids: number; total: number };
  year3: { cse: number; csbs: number; aids: number; total: number };
  total: { cse: number; csbs: number; aids: number; total: number };
}

interface DeptSummaryItem {
  department: string;
  totalStudents: number;
  year2Students: number;
  year3Students: number;
  completed: number;
  notStarted: number;
  inProgress: number;
  terminated: number;
  averageScore: number;
  averagePercentage: number;
  totalViolations: number;
}

interface YearSummaryItem {
  year: number;
  totalStudents: number;
  cse: number;
  csbs: number;
  aids: number;
  completed: number;
  notStarted: number;
  inProgress: number;
  terminated: number;
  averageScore: number;
  averagePercentage: number;
  totalViolations: number;
}

interface SummaryData {
  totalStudents: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  terminated: number;
  averageScore: number;
  averagePercentage: number;
  totalViolations: number;
  highestScore: number;
  lowestScore: number;
  averageCompletionTime: string;
}

interface SecurityIncident {
  id: string;
  roll_number: string;
  name: string;
  department: string;
  year: number;
  assessment: string;
  violation_type: string;
  violation_count: number;
  timestamp: string;
  severity: string;
  action_taken: string;
}

export default function AdminReportsPage() {
  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Raw API Response Data
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [matrix, setMatrix] = useState<MatrixData | null>(null);
  const [deptSummaries, setDeptSummaries] = useState<Record<string, DeptSummaryItem> | null>(null);
  const [yearSummaries, setYearSummaries] = useState<Record<string, YearSummaryItem> | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [securityIncidents, setSecurityIncidents] = useState<SecurityIncident[]>([]);

  // Filter Bar Form State
  const [filterYear, setFilterYear] = useState('all');
  const [filterDept, setFilterDept] = useState('all');
  const [filterAssessment, setFilterAssessment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Applied Filter State (what is currently active in table/summary)
  const [appliedYear, setAppliedYear] = useState('all');
  const [appliedDept, setAppliedDept] = useState('all');
  const [appliedAssessment, setAppliedAssessment] = useState('all');
  const [appliedStatus, setAppliedStatus] = useState('all');
  const [appliedSearch, setAppliedSearch] = useState('');

  // Sorting
  const [sortBy, setSortBy] = useState<'rank' | 'score' | 'register_number' | 'name' | 'percentage' | 'time'>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Interactive Department Performance Tool State
  const [perfDept, setPerfDept] = useState<'CSE' | 'CSBS' | 'AI&DS'>('CSE');
  const [perfYear, setPerfYear] = useState<'all' | '2' | '3'>('all');

  // Modals & Detail Views
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<ReportRow | null>(null);
  const [profileDrawerStudentId, setProfileDrawerStudentId] = useState<string | null>(null);

  // Sync state from URL search params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const urlYear = sp.get('year');
      const urlDept = sp.get('department');
      const urlAss = sp.get('assessment');
      const urlStat = sp.get('status');
      const urlSearch = sp.get('search');

      if (urlYear && ['2', '3'].includes(urlYear)) {
        setFilterYear(urlYear);
        setAppliedYear(urlYear);
      }
      if (urlDept && ['CSE', 'CSBS', 'AI&DS'].includes(urlDept.toUpperCase())) {
        setFilterDept(urlDept.toUpperCase());
        setAppliedDept(urlDept.toUpperCase());
      }
      if (urlAss) {
        setFilterAssessment(urlAss);
        setAppliedAssessment(urlAss);
      }
      if (urlStat) {
        setFilterStatus(urlStat.toLowerCase());
        setAppliedStatus(urlStat.toLowerCase());
      }
      if (urlSearch) {
        setSearchTerm(urlSearch);
        setAppliedSearch(urlSearch);
      }
    }
  }, []);

  // Sync active filters to URL state
  const updateUrlState = useCallback(
    (year: string, dept: string, assessment: string, status: string, search: string) => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams();
      if (year !== 'all') params.set('year', year);
      if (dept !== 'all') params.set('department', dept);
      if (assessment !== 'all') params.set('assessment', assessment);
      if (status !== 'all') params.set('status', status);
      if (search.trim()) params.set('search', search.trim());

      const newUrl = params.toString() ? `/admin/reports?${params.toString()}` : '/admin/reports';
      window.history.replaceState(null, '', newUrl);
    },
    []
  );

  // Fetch Reports Data from Turso API
  const fetchReportData = useCallback(
    async (
      year = appliedYear,
      dept = appliedDept,
      assessment = appliedAssessment,
      status = appliedStatus,
      search = appliedSearch
    ) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (year !== 'all') params.set('year', year);
        if (dept !== 'all') params.set('department', dept);
        if (assessment !== 'all') params.set('assessment', assessment);
        if (status !== 'all') params.set('status', status);
        if (search.trim()) params.set('search', search.trim());
        params.set('_t', Date.now().toString());

        const res = await fetch(`/api/admin/reports?${params.toString()}`, { cache: 'no-store' });
        const json = await res.json();

        if (json.success) {
          setRows(json.rows || []);
          setTests(json.tests || []);
          setMatrix(json.matrix || null);
          setDeptSummaries(json.departmentSummaries || null);
          setYearSummaries(json.yearSummaries || null);
          setSummary(json.summary || null);
          setSecurityIncidents(json.securityIncidents || []);
        } else {
          setError(json.error || 'Unable to load live report data from database.');
        }
      } catch (err: any) {
        console.error('Fetch reports error:', err);
        setError('Unable to load live report data.');
      } finally {
        setLoading(false);
      }
    },
    [appliedYear, appliedDept, appliedAssessment, appliedStatus, appliedSearch]
  );

  // Initial fetch on component mount
  useEffect(() => {
    fetchReportData(appliedYear, appliedDept, appliedAssessment, appliedStatus, appliedSearch);
  }, [fetchReportData, appliedYear, appliedDept, appliedAssessment, appliedStatus, appliedSearch]);

  // Handler: Apply Filters button clicked
  const handleApplyFilters = () => {
    setAppliedYear(filterYear);
    setAppliedDept(filterDept);
    setAppliedAssessment(filterAssessment);
    setAppliedStatus(filterStatus);
    setAppliedSearch(searchTerm);
    updateUrlState(filterYear, filterDept, filterAssessment, filterStatus, searchTerm);
    fetchReportData(filterYear, filterDept, filterAssessment, filterStatus, searchTerm);
  };

  // Handler: Reset Filters button clicked
  const handleResetFilters = () => {
    setFilterYear('all');
    setFilterDept('all');
    setFilterAssessment('all');
    setFilterStatus('all');
    setSearchTerm('');

    setAppliedYear('all');
    setAppliedDept('all');
    setAppliedAssessment('all');
    setAppliedStatus('all');
    setAppliedSearch('');

    updateUrlState('all', 'all', 'all', 'all', '');
    fetchReportData('all', 'all', 'all', 'all', '');
  };

  // Handler: Quick filter from matrix or summary click
  const handleQuickFilter = (targetYear: string, targetDept: string) => {
    setFilterYear(targetYear);
    setFilterDept(targetDept);
    setAppliedYear(targetYear);
    setAppliedDept(targetDept);
    updateUrlState(targetYear, targetDept, appliedAssessment, appliedStatus, appliedSearch);
    fetchReportData(targetYear, targetDept, appliedAssessment, appliedStatus, appliedSearch);

    // Smooth scroll down to the table
    const tableEl = document.getElementById('report-table-section');
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Sorted Rows for Table Display
  const sortedRows = useMemo(() => {
    const list = [...rows];
    list.sort((a, b) => {
      let comp = 0;
      if (sortBy === 'rank') {
        const rA = typeof a.rank === 'number' ? a.rank : 999999;
        const rB = typeof b.rank === 'number' ? b.rank : 999999;
        comp = rA - rB;
      } else if (sortBy === 'score') {
        comp = (b.score || 0) - (a.score || 0);
      } else if (sortBy === 'percentage') {
        comp = (b.percentage || 0) - (a.percentage || 0);
      } else if (sortBy === 'name') {
        comp = a.name.localeCompare(b.name);
      } else if (sortBy === 'register_number') {
        comp = a.register_number.localeCompare(b.register_number);
      } else if (sortBy === 'time') {
        comp = a.time_taken_seconds - b.time_taken_seconds;
      }
      return sortOrder === 'asc' ? comp : -comp;
    });
    return list;
  }, [rows, sortBy, sortOrder]);

  // Students who broke proctoring rules (any violation, or terminated) are listed
  // separately from the ranked results, on screen and in exports
  const isFlagged = (r: ReportRow) => r.violations > 0 || r.status === 'TERMINATED';
  const cleanRows = sortedRows.filter((r) => !isFlagged(r));
  const flaggedRows = sortedRows.filter(isFlagged);

  const renderResultsTable = (list: ReportRow[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
            <th className="py-3 px-3 text-center">Rank</th>
            <th className="py-3 px-3">Roll No</th>
            <th className="py-3 px-3">Name</th>
            <th className="py-3 px-2">Dept</th>
            <th className="py-3 px-2 text-center">Year</th>
            <th className="py-3 px-3">Assessment</th>
            <th className="py-3 px-3 text-right">Score</th>
            <th className="py-3 px-2 text-right">Total</th>
            <th className="py-3 px-3 text-center">%</th>
            <th className="py-3 px-3 text-center">Time</th>
            <th className="py-3 px-3 text-center">Violations</th>
            <th className="py-3 px-3">Status</th>
            <th className="py-3 px-3">Completion Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-mono">
          {list.map((r) => {
            const isClean = r.violations === 0;
            return (
              <tr key={r.id} className="hover:bg-slate-50/80 transition">
                {/* RANK (Requirement 13) */}
                <td className="py-3 px-3 text-center">
                  {typeof r.rank === 'number' ? (
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        r.rank === 1
                          ? 'bg-amber-100 text-amber-800'
                          : r.rank === 2
                          ? 'bg-slate-200 text-slate-800'
                          : r.rank === 3
                          ? 'bg-amber-50 text-amber-700'
                          : 'text-slate-600'
                      }`}
                    >
                      {r.rank}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>

                {/* ROLL NO (Clickable for student modal - Requirement 12) */}
                <td className="py-3 px-3">
                  <button
                    onClick={() => setSelectedStudentForModal(r)}
                    className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
                    title="Click to view complete candidate examination record"
                  >
                    <span>{r.register_number}</span>
                  </button>
                </td>

                {/* NAME */}
                <td className="py-3 px-3 font-sans text-slate-900 font-semibold max-w-[180px] truncate">
                  {r.name}
                </td>

                {/* DEPARTMENT */}
                <td className="py-3 px-2 text-slate-700 font-semibold">{r.department}</td>

                {/* YEAR */}
                <td className="py-3 px-2 text-center text-slate-500 font-bold">{r.year}</td>

                {/* ASSESSMENT */}
                <td className="py-3 px-3 font-sans text-[11px] text-slate-600 max-w-[200px] truncate">
                  {r.assessment}
                </td>

                {/* SCORE */}
                <td className="py-3 px-3 text-right font-black text-emerald-600">
                  {r.score !== null ? r.score : '—'}
                </td>

                {/* TOTAL MARKS */}
                <td className="py-3 px-2 text-right text-slate-400">{r.total_marks}</td>

                {/* PERCENTAGE */}
                <td className="py-3 px-3 text-center font-bold text-slate-700">
                  {r.percentage !== null ? `${r.percentage}%` : '—'}
                </td>

                {/* TIME TAKEN */}
                <td className="py-3 px-3 text-center text-slate-500 text-[11px]">
                  {r.time_taken_formatted}
                </td>

                {/* VIOLATIONS */}
                <td className="py-3 px-3 text-center">
                  {isClean ? (
                    <span className="text-emerald-600 font-semibold text-[11px]">Clean</span>
                  ) : (
                    <span className="text-rose-600 font-bold text-[11px]">
                      {r.violations} flags
                    </span>
                  )}
                </td>

                {/* STATUS */}
                <td className="py-3 px-3 font-sans text-[11px]">
                  <span
                    className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-[10px] ${
                      r.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : r.status === 'IN PROGRESS'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : r.status === 'TERMINATED'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {r.status}
                  </span>
                </td>

                {/* COMPLETION TIME */}
                <td className="py-3 px-3 text-slate-500 text-[11px] font-sans">
                  {r.completion_time}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // Export rows: ranked results first, then rule violators in their own section
  const reportSections = (missing: string | number) => {
    const toExportRow = (r: ReportRow) => ({
      'Roll Number': r.register_number,
      Name: r.name,
      Department: r.department,
      Year: r.year,
      Assessment: r.assessment,
      Score: r.score !== null ? r.score : missing,
      'Total Marks': r.total_marks,
      Percentage: r.percentage !== null ? `${r.percentage}%` : missing === 0 ? '0%' : missing,
      'Time Taken': r.time_taken_formatted,
      Violations: r.violations,
      Status: r.status,
      'Completion Time': r.completion_time,
      Rank: r.rank,
    });
    return [
      { title: `Results (${cleanRows.length})`, rows: cleanRows.map(toExportRow) },
      {
        title: `Rule violations (${flaggedRows.length}) - not ranked`,
        rows: flaggedRows.map((r) => ({
          ...toExportRow(r),
          'Tab Switches': r.tab_switches,
          'Fullscreen Exits': r.fullscreen_exits,
        })),
      },
    ];
  };

  // Export: Filtered Results CSV (Requirement 8 & 9)
  const handleExportFilteredCSV = () => {
    if (sortedRows.length === 0) return;
    const filename = `JIT_CodeArena_Report_${appliedYear !== 'all' ? `Yr${appliedYear}_` : ''}${appliedDept !== 'all' ? `${appliedDept}_` : 'All_Depts'}`;
    exportSectionsToCsv(filename, reportSections('—'));
  };

  // Export: Filtered Results Excel (Requirement 9)
  const handleExportFilteredExcel = () => {
    if (sortedRows.length === 0) return;
    const filename = `JIT_CodeArena_GradeSheet_${appliedYear !== 'all' ? `Yr${appliedYear}_` : ''}${appliedDept !== 'all' ? `${appliedDept}` : 'All'}`;
    exportSectionsToExcel(filename, reportSections(0));
  };

  // Export: Anti-Cheating Audit Incident Report (Requirement 10)
  const handleExportSecurityAudit = () => {
    if (securityIncidents.length === 0) {
      alert('No anti-cheating incidents recorded for the selected filter.');
      return;
    }

    const exportDataset = securityIncidents.map((inc) => ({
      'Roll Number': inc.roll_number,
      Name: inc.name,
      Department: inc.department,
      Year: inc.year,
      Assessment: inc.assessment,
      'Violation Type': inc.violation_type,
      'Violation Count': inc.violation_count,
      Timestamp: inc.timestamp,
      Severity: inc.severity,
      'Action Taken': inc.action_taken,
    }));

    const filename = `JIT_Proctoring_Audit_Report_${appliedYear !== 'all' ? `Yr${appliedYear}_` : ''}${appliedDept !== 'all' ? `${appliedDept}` : 'All'}`;
    exportToCsv(filename, exportDataset);
  };

  // Trigger Print Report (Requirement 9)
  const handlePrintReport = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Department Performance Summary interactive calculation (Requirement 11)
  const perfData = useMemo(() => {
    let list = rows.filter((r) => r.department === perfDept);
    if (perfYear !== 'all') {
      list = list.filter((r) => r.year === Number(perfYear));
    }

    const numStudents = list.length;
    const completedList = list.filter((r) => r.status === 'COMPLETED');
    const completed = completedList.length;
    const terminated = list.filter((r) => r.status === 'TERMINATED').length;
    const totalViolations = list.reduce((sum, r) => sum + r.violations, 0);

    const totalScore = completedList.reduce((sum, r) => sum + (r.score || 0), 0);
    const totalPct = completedList.reduce((sum, r) => sum + (r.percentage || 0), 0);
    const avgScore = completed > 0 ? Math.round((totalScore / completed) * 10) / 10 : 0;
    const avgPct = completed > 0 ? Math.round((totalPct / completed) * 10) / 10 : 0;

    let highestScore = 0;
    let lowestScore = 0;
    let avgTimeSecs = 0;

    if (completed > 0) {
      highestScore = Math.max(...completedList.map((r) => r.score || 0));
      lowestScore = Math.min(...completedList.map((r) => r.score || 0));
      const totalTime = completedList.reduce((sum, r) => sum + r.time_taken_seconds, 0);
      avgTimeSecs = Math.round(totalTime / completed);
    }

    const mins = Math.floor(avgTimeSecs / 60);
    const secs = avgTimeSecs % 60;
    const avgTime = completed > 0 ? `${mins}m ${secs}s` : '—';

    return {
      numStudents,
      completed,
      avgScore,
      avgPct,
      highestScore,
      lowestScore,
      avgTime,
      totalViolations,
      terminated,
    };
  }, [rows, perfDept, perfYear]);

  // Active filter readable label
  const activeFilterLabel = useMemo(() => {
    const parts = [];
    if (appliedYear !== 'all') parts.push(`Year ${appliedYear}`);
    else parts.push('All Years');

    if (appliedDept !== 'all') parts.push(appliedDept);
    else parts.push('All Departments');

    if (appliedAssessment !== 'all') {
      const match = tests.find((t) => t.id === appliedAssessment);
      parts.push(match ? match.title : 'Selected Assessment');
    }

    if (appliedStatus !== 'all') {
      parts.push(appliedStatus.toUpperCase().replace('_', ' '));
    }

    return parts.join(' • ');
  }, [appliedYear, appliedDept, appliedAssessment, appliedStatus, tests]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6 pb-28">
      {/* Print-Only College Header */}
      <div className="hidden print:block mb-6 border-b pb-4 text-center">
        <h1 className="text-xl font-black tracking-tight text-slate-900">
          JANSONS INSTITUTE OF TECHNOLOGY
        </h1>
        <p className="text-xs text-slate-600 font-semibold uppercase tracking-wider">
          Examination Reports & Certified Grade Sheet Center
        </p>
        <p className="text-xs text-indigo-700 font-bold mt-1">
          Active Report Scope: {activeFilterLabel}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          Generated on {new Date().toLocaleString()} • Database Single Source of Truth
        </p>
      </div>

      {/* Main Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-600">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Examination Reports & Export Center
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Certified college evaluation records, invigilation audit trail, and department analytics.
          </p>
        </div>

        {/* Global Action Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => fetchReportData(appliedYear, appliedDept, appliedAssessment, appliedStatus, appliedSearch)}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-indigo-600 rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
            title="Live refresh from Turso database"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handlePrintReport}
            className="px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-xs"
            title="Print certified grade sheet"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Report</span>
          </button>

          <button
            onClick={handleExportFilteredExcel}
            disabled={sortedRows.length === 0}
            className="px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-xs disabled:opacity-40"
            title="Export to Microsoft Excel format"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleExportFilteredCSV}
            disabled={sortedRows.length === 0}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-sm shadow-emerald-600/20 cursor-pointer"
            title="Download CSV for current filtered dataset"
          >
            <Download className="w-4 h-4" />
            <span>Export Complete Results CSV</span>
          </button>
        </div>
      </div>

      {/* ERROR BANNER WITH RETRY (Requirement 17) */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-800 text-xs font-semibold">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchReportData(appliedYear, appliedDept, appliedAssessment, appliedStatus, appliedSearch)}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. REPORT FILTER BAR (Requirement 1 & 2)                       */}
      {/* ============================================================== */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Filter Reports & Grade Sheets
            </h2>
          </div>
          <div className="text-[11px] text-slate-500">
            Active: <span className="font-bold text-indigo-600">{activeFilterLabel}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* YEAR FILTER */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Academic Year
            </label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="all">All Years</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
            </select>
          </div>

          {/* DEPARTMENT FILTER */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Department
            </label>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="all">All Departments</option>
              <option value="CSE">CSE</option>
              <option value="CSBS">CSBS</option>
              <option value="AI&DS">AI&DS</option>
            </select>
          </div>

          {/* ASSESSMENT FILTER */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Assessment
            </label>
            <select
              value={filterAssessment}
              onChange={(e) => setFilterAssessment(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="all">All Assessments</option>
              {tests.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} (Yr {t.year})
                </option>
              ))}
            </select>
          </div>

          {/* STATUS FILTER */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="all">All</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="not_started">Not Started</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>

          {/* CANDIDATE SEARCH */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Student Search
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Roll No or Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-500 transition text-xs"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="text-[11px] text-slate-400 font-medium">
            Turso Database single source of truth • Dynamic ranking enabled
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            >
              Reset Filters
            </button>
            <button
              onClick={handleApplyFilters}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-indigo-600/20 cursor-pointer"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. REPORT SUMMARY CARDS (Requirement 3)                        */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* TOTAL STUDENTS */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total Students
          </span>
          {loading ? (
            <div className="h-7 w-12 bg-slate-200 animate-pulse rounded-md" />
          ) : (
            <div className="text-xl sm:text-2xl font-black text-slate-900">{summary?.totalStudents ?? 0}</div>
          )}
          <span className="text-[10px] text-slate-400">Enrolled Roster</span>
        </div>

        {/* COMPLETED */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block mb-1">
            Completed
          </span>
          {loading ? (
            <div className="h-7 w-12 bg-slate-200 animate-pulse rounded-md" />
          ) : (
            <div className="text-xl sm:text-2xl font-black text-emerald-600">{summary?.completed ?? 0}</div>
          )}
          <span className="text-[10px] text-emerald-500 font-medium">Submitted Tests</span>
        </div>

        {/* IN PROGRESS */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block mb-1">
            In Progress
          </span>
          {loading ? (
            <div className="h-7 w-12 bg-slate-200 animate-pulse rounded-md" />
          ) : (
            <div className="text-xl sm:text-2xl font-black text-indigo-600">{summary?.inProgress ?? 0}</div>
          )}
          <span className="text-[10px] text-indigo-400 font-medium">Active In Exam</span>
        </div>

        {/* NOT STARTED */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Not Started
          </span>
          {loading ? (
            <div className="h-7 w-12 bg-slate-200 animate-pulse rounded-md" />
          ) : (
            <div className="text-xl sm:text-2xl font-black text-slate-600">{summary?.notStarted ?? 0}</div>
          )}
          <span className="text-[10px] text-slate-400">Pending Start</span>
        </div>

        {/* TERMINATED */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block mb-1">
            Terminated
          </span>
          {loading ? (
            <div className="h-7 w-12 bg-slate-200 animate-pulse rounded-md" />
          ) : (
            <div className="text-xl sm:text-2xl font-black text-rose-600">{summary?.terminated ?? 0}</div>
          )}
          <span className="text-[10px] text-rose-500 font-medium">Disciplinary Flags</span>
        </div>

        {/* AVERAGE SCORE */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 block mb-1">
            Avg Score
          </span>
          {loading ? (
            <div className="h-7 w-12 bg-slate-200 animate-pulse rounded-md" />
          ) : (
            <div className="text-xl sm:text-2xl font-black text-purple-600">{summary?.averageScore ?? 0}</div>
          )}
          <span className="text-[10px] text-purple-400">Mean Marks</span>
        </div>

        {/* AVERAGE PERCENTAGE */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block mb-1">
            Avg Percentage
          </span>
          {loading ? (
            <div className="h-7 w-12 bg-slate-200 animate-pulse rounded-md" />
          ) : (
            <div className="text-xl sm:text-2xl font-black text-blue-600">{summary?.averagePercentage ?? 0}%</div>
          )}
          <span className="text-[10px] text-blue-400">Performance</span>
        </div>

        {/* TOTAL VIOLATIONS */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block mb-1">
            Violations
          </span>
          {loading ? (
            <div className="h-7 w-12 bg-slate-200 animate-pulse rounded-md" />
          ) : (
            <div className="text-xl sm:text-2xl font-black text-amber-600">{summary?.totalViolations ?? 0}</div>
          )}
          <span className="text-[10px] text-amber-500">Security Flags</span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. YEAR + DEPARTMENT COMBINED MATRIX (Requirement 7)           */}
      {/* ============================================================== */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-600" />
              <span>Institutional Enrollment & Distribution Matrix</span>
            </h2>
            <p className="text-[11px] text-slate-500">
              Live Turso database counts. Click any cell to immediately filter the detailed candidate report.
            </p>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Click cell to filter • Synchronized
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs font-mono">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase text-[11px] tracking-wider border-b border-slate-200 font-sans">
                <th className="py-3 px-4 text-left font-bold">Academic Year</th>
                <th className="py-3 px-4 font-bold text-emerald-700">CSE</th>
                <th className="py-3 px-4 font-bold text-blue-700">CSBS</th>
                <th className="py-3 px-4 font-bold text-amber-700">AI&DS</th>
                <th className="py-3 px-4 font-bold text-slate-900 bg-slate-100/70">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* YEAR 2 ROW */}
              <tr className="hover:bg-indigo-50/40 transition">
                <td className="py-3 px-4 text-left font-bold font-sans text-slate-800">
                  <button
                    onClick={() => handleQuickFilter('2', 'all')}
                    className="hover:text-indigo-600 transition flex items-center gap-1 cursor-pointer"
                    title="Filter all Year 2 students"
                  >
                    <span>YEAR 2 (Sophomore)</span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </button>
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => handleQuickFilter('2', 'CSE')}
                    className="w-full py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg transition cursor-pointer border border-emerald-200/50"
                    title="View Year 2 CSE Students"
                  >
                    {matrix?.year2.cse ?? 0}
                  </button>
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => handleQuickFilter('2', 'CSBS')}
                    className="w-full py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold rounded-lg transition cursor-pointer border border-blue-200/50"
                    title="View Year 2 CSBS Students"
                  >
                    {matrix?.year2.csbs ?? 0}
                  </button>
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => handleQuickFilter('2', 'AI&DS')}
                    className="w-full py-1.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg transition cursor-pointer border border-amber-200/50"
                    title="View Year 2 AI&DS Students"
                  >
                    {matrix?.year2.aids ?? 0}
                  </button>
                </td>
                <td className="py-3 px-4 bg-slate-50/60 font-bold text-slate-900">
                  <button
                    onClick={() => handleQuickFilter('2', 'all')}
                    className="w-full py-1.5 px-3 bg-slate-200/70 hover:bg-slate-300 text-slate-900 font-black rounded-lg transition cursor-pointer"
                    title="View all Year 2 Students"
                  >
                    {matrix?.year2.total ?? 0}
                  </button>
                </td>
              </tr>

              {/* YEAR 3 ROW */}
              <tr className="hover:bg-purple-50/40 transition">
                <td className="py-3 px-4 text-left font-bold font-sans text-slate-800">
                  <button
                    onClick={() => handleQuickFilter('3', 'all')}
                    className="hover:text-purple-600 transition flex items-center gap-1 cursor-pointer"
                    title="Filter all Year 3 students"
                  >
                    <span>YEAR 3 (Junior)</span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </button>
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => handleQuickFilter('3', 'CSE')}
                    className="w-full py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg transition cursor-pointer border border-emerald-200/50"
                    title="View Year 3 CSE Students"
                  >
                    {matrix?.year3.cse ?? 0}
                  </button>
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => handleQuickFilter('3', 'CSBS')}
                    className="w-full py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold rounded-lg transition cursor-pointer border border-blue-200/50"
                    title="View Year 3 CSBS Students"
                  >
                    {matrix?.year3.csbs ?? 0}
                  </button>
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => handleQuickFilter('3', 'AI&DS')}
                    className="w-full py-1.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg transition cursor-pointer border border-amber-200/50"
                    title="View Year 3 AI&DS Students"
                  >
                    {matrix?.year3.aids ?? 0}
                  </button>
                </td>
                <td className="py-3 px-4 bg-slate-50/60 font-bold text-slate-900">
                  <button
                    onClick={() => handleQuickFilter('3', 'all')}
                    className="w-full py-1.5 px-3 bg-slate-200/70 hover:bg-slate-300 text-slate-900 font-black rounded-lg transition cursor-pointer"
                    title="View all Year 3 Students"
                  >
                    {matrix?.year3.total ?? 0}
                  </button>
                </td>
              </tr>

              {/* TOTAL ROW */}
              <tr className="bg-slate-100/70 font-bold text-slate-900 border-t-2 border-slate-200">
                <td className="py-3.5 px-4 text-left font-black font-sans text-slate-900">
                  <button
                    onClick={() => handleQuickFilter('all', 'all')}
                    className="hover:text-indigo-600 transition flex items-center gap-1 cursor-pointer"
                    title="Reset to all students"
                  >
                    <span>GRAND TOTAL</span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </button>
                </td>
                <td className="py-3.5 px-4">
                  <button
                    onClick={() => handleQuickFilter('all', 'CSE')}
                    className="w-full py-1.5 px-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-black rounded-lg transition cursor-pointer border border-emerald-300/60"
                    title="View all CSE Students across years"
                  >
                    {matrix?.total.cse ?? 0}
                  </button>
                </td>
                <td className="py-3.5 px-4">
                  <button
                    onClick={() => handleQuickFilter('all', 'CSBS')}
                    className="w-full py-1.5 px-3 bg-blue-100 hover:bg-blue-200 text-blue-900 font-black rounded-lg transition cursor-pointer border border-blue-300/60"
                    title="View all CSBS Students across years"
                  >
                    {matrix?.total.csbs ?? 0}
                  </button>
                </td>
                <td className="py-3.5 px-4">
                  <button
                    onClick={() => handleQuickFilter('all', 'AI&DS')}
                    className="w-full py-1.5 px-3 bg-amber-100 hover:bg-amber-200 text-amber-900 font-black rounded-lg transition cursor-pointer border border-amber-300/60"
                    title="View all AI&DS Students across years"
                  >
                    {matrix?.total.aids ?? 0}
                  </button>
                </td>
                <td className="py-3.5 px-4 bg-slate-200/80 text-indigo-950 font-black">
                  <button
                    onClick={() => handleQuickFilter('all', 'all')}
                    className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-lg transition cursor-pointer shadow-xs"
                    title="Reset to entire candidate directory"
                  >
                    {matrix?.total.total ?? 0}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. DEPARTMENT REPORT (Requirement 5) & YEAR REPORT (Req 6)      */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
        {/* DEPARTMENT BREAKDOWN (Requirement 5) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600" />
              <span>Department Summary & Analytics</span>
            </h2>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Click Card to Filter
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['CSE', 'CSBS', 'AI&DS'] as const).map((dept) => {
              const d = deptSummaries?.[dept];
              const isSelected = appliedDept === dept;
              return (
                <div
                  key={dept}
                  onClick={() => handleQuickFilter(appliedYear, dept)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50/60 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                      : 'bg-slate-50/70 border-slate-200/90 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-sm text-slate-900">{dept}</span>
                    <span className="text-[11px] font-bold text-emerald-600 font-mono">
                      {d?.totalStudents ?? 0} Total
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-600 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Yr 2 / Yr 3:</span>
                      <span>
                        {d?.year2Students ?? 0} / {d?.year3Students ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Completed:</span>
                      <span className="text-emerald-700 font-bold">{d?.completed ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">In Progress:</span>
                      <span className="text-indigo-600">{d?.inProgress ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Not Started:</span>
                      <span>{d?.notStarted ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Avg Score (%):</span>
                      <span className="font-bold text-slate-800">
                        {d?.averageScore ?? 0} ({d?.averagePercentage ?? 0}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Violations:</span>
                      <span className={(d?.totalViolations ?? 0) > 0 ? 'text-amber-600 font-bold' : ''}>
                        {d?.totalViolations ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* YEAR BREAKDOWN (Requirement 6) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-purple-600" />
              <span>Academic Year Performance Cohorts</span>
            </h2>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Click Cohort to Filter
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([2, 3] as const).map((yr) => {
              const y = yr === 2 ? yearSummaries?.year2 : yearSummaries?.year3;
              const isSelected = appliedYear === String(yr);
              return (
                <div
                  key={yr}
                  onClick={() => handleQuickFilter(String(yr), appliedDept)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-50/60 border-purple-500 shadow-sm ring-1 ring-purple-500'
                      : 'bg-slate-50/70 border-slate-200/90 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-sm text-slate-900">
                      YEAR {yr} ({yr === 2 ? 'Sophomores' : 'Juniors'})
                    </span>
                    <span className="text-[11px] font-bold text-purple-600 font-mono">
                      {y?.totalStudents ?? 0} Students
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-600 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">CSE / CSBS / AI&DS:</span>
                      <span>
                        {y?.cse ?? 0} / {y?.csbs ?? 0} / {y?.aids ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Completed:</span>
                      <span className="text-emerald-700 font-bold">{y?.completed ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">In Progress:</span>
                      <span className="text-indigo-600">{y?.inProgress ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Not Started:</span>
                      <span>{y?.notStarted ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Avg Score:</span>
                      <span className="font-bold text-slate-800">
                        {y?.averageScore ?? 0} ({y?.averagePercentage ?? 0}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Terminated:</span>
                      <span className={(y?.terminated ?? 0) > 0 ? 'text-rose-600 font-bold' : ''}>
                        {y?.terminated ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. INTERACTIVE DEPARTMENT PERFORMANCE SUMMARY (Requirement 11) */}
      {/* ============================================================== */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600" />
              <span>Department Performance Executive Breakdown</span>
            </h2>
            <p className="text-[11px] text-slate-500">
              Interactive high-level performance metrics formatted for HOD review.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <select
              value={perfDept}
              onChange={(e: any) => setPerfDept(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold"
            >
              <option value="CSE">CSE</option>
              <option value="CSBS">CSBS</option>
              <option value="AI&DS">AI&DS</option>
            </select>

            <select
              value={perfYear}
              onChange={(e: any) => setPerfYear(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold"
            >
              <option value="all">All Years</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
            </select>

            <button
              onClick={() => {
                const data = [
                  {
                    Department: perfDept,
                    Year: perfYear === 'all' ? 'All Years' : `Year ${perfYear}`,
                    'Number of Students': perfData.numStudents,
                    Completed: perfData.completed,
                    'Average Score': perfData.avgScore,
                    'Average Percentage': `${perfData.avgPct}%`,
                    'Highest Score': perfData.highestScore,
                    'Lowest Score': perfData.lowestScore,
                    'Average Completion Time': perfData.avgTime,
                    'Total Violations': perfData.totalViolations,
                    'Terminated Students': perfData.terminated,
                  },
                ];
                exportToCsv(`JIT_${perfDept}_Performance_Summary`, data);
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Summary CSV</span>
            </button>
          </div>
        </div>

        {/* Dynamic Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-[10px] text-slate-400 font-sans block mb-1">Students Enrolled</span>
            <span className="text-lg font-black text-slate-900">{perfData.numStudents}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-[10px] text-slate-400 font-sans block mb-1">Completed Rate</span>
            <span className="text-lg font-black text-emerald-600">
              {perfData.completed} / {perfData.numStudents}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-[10px] text-slate-400 font-sans block mb-1">Average Score</span>
            <span className="text-lg font-black text-purple-600">
              {perfData.avgScore} ({perfData.avgPct}%)
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-[10px] text-slate-400 font-sans block mb-1">High / Low Score</span>
            <span className="text-lg font-black text-indigo-600">
              {perfData.highestScore} / {perfData.lowestScore}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-[10px] text-slate-400 font-sans block mb-1">Avg Completion Time</span>
            <span className="text-lg font-black text-slate-800">{perfData.avgTime}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-[10px] text-slate-400 font-sans block mb-1">Violations / Terminated</span>
            <span className="text-lg font-black text-rose-600">
              {perfData.totalViolations} / {perfData.terminated}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 6. MAIN REPORT TABLE (Requirement 4, 13, 16)                   */}
      {/* ============================================================== */}
      <div
        id="report-table-section"
        className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xs p-6 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Assessment Detailed Grade Sheet & Invigilation Table</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Scope: <span className="font-bold text-indigo-600">{activeFilterLabel}</span> • Click roll number for student modal
            </p>
          </div>

          {/* Table Sort Controls */}
          <div className="flex items-center gap-2 text-xs print:hidden">
            <span className="text-slate-400 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700"
            >
              <option value="rank">Rank</option>
              <option value="score">Score</option>
              <option value="percentage">Percentage</option>
              <option value="register_number">Roll No</option>
              <option value="name">Name</option>
              <option value="time">Time Taken</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition cursor-pointer"
              title="Toggle sort direction"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-slate-500 font-mono ml-2">
              {sortedRows.length} Candidates
            </span>
          </div>
        </div>

        {/* LOADING SKELETON (Requirement 17) */}
        {loading ? (
          <div className="space-y-3 py-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-xl w-full" />
            ))}
          </div>
        ) : sortedRows.length === 0 ? (
          /* EMPTY RESULTS MESSAGE (Requirement 16) */
          <div className="text-center py-16 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">
              No assessment records found for {activeFilterLabel}.
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No student records match the specified combination in the database.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-4 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            {cleanRows.length > 0 ? (
              renderResultsTable(cleanRows)
            ) : (
              <p className="text-xs text-slate-500 py-4">No candidates without rule violations for {activeFilterLabel}.</p>
            )}
            {flaggedRows.length > 0 && (
              <div className="mt-8 break-before-page">
                <h3 className="text-sm font-bold text-rose-700 flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  Rule violations ({flaggedRows.length})
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Candidates with proctoring violations or a terminated attempt. They are not ranked with the results above.
                </p>
                {renderResultsTable(flaggedRows)}
              </div>
            )}
          </>
        )}
      </div>

      {/* ============================================================== */}
      {/* 7. EXPORT CARDS (Requirement 8, 9, 10)                         */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 print:hidden">
        {/* COMPREHENSIVE ASSESSMENT CSV */}
        <div className="bg-white rounded-3xl p-6 space-y-4 border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Filtered Assessment CSV</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Exports exactly the filtered dataset ({sortedRows.length} candidates) with scores, percentages, ranks, and completion times.
            </p>
          </div>
          <button
            onClick={handleExportFilteredCSV}
            disabled={sortedRows.length === 0}
            className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold transition border border-emerald-200 shadow-xs cursor-pointer disabled:opacity-40"
          >
            Download Filtered CSV
          </button>
        </div>

        {/* SECURITY AUDIT REPORT (Requirement 10) */}
        <div className="bg-white rounded-3xl p-6 space-y-4 border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Anti-Cheating Audit Incident Report</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Filtered log of security events (tab switches, deviations, clipboard flags) strictly for {activeFilterLabel}.
            </p>
          </div>
          <button
            onClick={handleExportSecurityAudit}
            className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-semibold transition border border-amber-200 shadow-xs cursor-pointer"
          >
            Export Security Incidents ({securityIncidents.length})
          </button>
        </div>

        {/* EXCEL GRADE SHEET (Requirement 9) */}
        <div className="bg-white rounded-3xl p-6 space-y-4 border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Official College Excel Grade Sheet</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Pre-formatted Microsoft Excel XML spreadsheet ready for institutional archives and academic verification.
            </p>
          </div>
          <button
            onClick={handleExportFilteredExcel}
            disabled={sortedRows.length === 0}
            className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold transition border border-indigo-200 shadow-xs cursor-pointer disabled:opacity-40"
          >
            Download Excel Grade Sheet
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 8. STUDENT DETAILS REPORT MODAL (Requirement 12)               */}
      {/* ============================================================== */}
      {selectedStudentForModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold">
                  {selectedStudentForModal.register_number.slice(-3)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedStudentForModal.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {selectedStudentForModal.register_number} • {selectedStudentForModal.department} • Year {selectedStudentForModal.year} (Sec {selectedStudentForModal.section})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentForModal(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Assessment Status Badge */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Assessment Title</span>
                <span className="font-bold text-sm text-slate-900">
                  {selectedStudentForModal.assessment}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block font-medium">Session Status</span>
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider inline-block ${
                    selectedStudentForModal.status === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedStudentForModal.status === 'IN PROGRESS'
                      ? 'bg-indigo-100 text-indigo-800'
                      : selectedStudentForModal.status === 'TERMINATED'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {selectedStudentForModal.status}
                </span>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <span className="text-[10px] text-slate-400 font-sans block mb-1">Score / Total</span>
                <span className="text-lg font-black text-emerald-600">
                  {selectedStudentForModal.score !== null ? selectedStudentForModal.score : '—'} / {selectedStudentForModal.total_marks}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <span className="text-[10px] text-slate-400 font-sans block mb-1">Percentage</span>
                <span className="text-lg font-black text-indigo-600">
                  {selectedStudentForModal.percentage !== null ? `${selectedStudentForModal.percentage}%` : '—'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <span className="text-[10px] text-slate-400 font-sans block mb-1">Rank in Cohort</span>
                <span className="text-lg font-black text-purple-600">
                  {typeof selectedStudentForModal.rank === 'number' ? `#${selectedStudentForModal.rank}` : '—'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <span className="text-[10px] text-slate-400 font-sans block mb-1">Time Taken</span>
                <span className="text-lg font-black text-slate-800">
                  {selectedStudentForModal.time_taken_formatted}
                </span>
              </div>
            </div>

            {/* Proctoring & Security Details */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Proctoring & Invigilation Logs
              </h4>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Tab Switches:</span>
                  <span className="font-bold text-slate-800">{selectedStudentForModal.tab_switches}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Fullscreen Exits:</span>
                  <span className="font-bold text-slate-800">{selectedStudentForModal.fullscreen_exits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Total Violation Flags:</span>
                  <span
                    className={
                      selectedStudentForModal.violations > 0
                        ? 'font-bold text-rose-600'
                        : 'font-semibold text-emerald-600'
                    }
                  >
                    {selectedStudentForModal.violations > 0
                      ? `${selectedStudentForModal.violations} Violations`
                      : '0 Flags (Clean Examination)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Completion Timestamp:</span>
                  <span className="text-slate-700 font-sans">{selectedStudentForModal.completion_time}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setProfileDrawerStudentId(selectedStudentForModal.student_id);
                  setSelectedStudentForModal(null);
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Open Full Institutional Profile</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setSelectedStudentForModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Institutional Student Profile Drawer */}
      <StudentProfileDrawer
        studentId={profileDrawerStudentId}
        onClose={() => setProfileDrawerStudentId(null)}
      />
    </div>
  );
}
