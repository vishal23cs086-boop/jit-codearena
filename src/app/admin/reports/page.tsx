'use client';

import React, { useState, useEffect } from 'react';
import { exportToCsv } from '@/lib/utils';
import { fetchAttempts, fetchStudents } from '@/lib/db';
import { TestAttempt, StudentProfile } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  FileSpreadsheet,
  Download,
  FileText,
  ShieldAlert,
  Users,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [allAttempts, allStudents] = await Promise.all([
          fetchAttempts(),
          fetchStudents(),
        ]);
        setAttempts(allAttempts);
        setStudents(allStudents);
      } catch (err) {
        console.error('Failed to load reports data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const reportRows = attempts.map((a) => {
    const student = a.students;
    const minutes = Math.floor((a.time_taken_seconds || 0) / 60);
    const seconds = (a.time_taken_seconds || 0) % 60;

    return {
      id: a.id,
      registerNumber: student?.register_number || 'N/A',
      name: student?.profiles?.full_name || 'Candidate',
      department: student?.department || 'Engineering',
      year: student?.year || 2,
      test: a.tests?.title || 'Python Assessment',
      score: a.score ?? 0,
      percentage: `${a.percentage ?? 0}%`,
      startTime: a.started_at ? new Date(a.started_at).toLocaleTimeString() : 'N/A',
      completionTime: a.completed_at ? new Date(a.completed_at).toLocaleTimeString() : 'In Progress',
      timeTaken: `${minutes}m ${seconds}s`,
      tabSwitches: a.tab_switch_count || 0,
      fullscreenExits: a.fullscreen_exit_count || 0,
      status: a.status ? a.status.replace('_', ' ').toUpperCase() : 'IN PROGRESS',
    };
  });

  const handleExportAllResults = () => {
    if (reportRows.length === 0) return;
    const csvData = reportRows.map((r) => ({
      'Register Number': r.registerNumber,
      Name: r.name,
      Department: r.department,
      Year: r.year,
      Assessment: r.test,
      Score: r.score,
      Percentage: r.percentage,
      'Start Time': r.startTime,
      'Completion Time': r.completionTime,
      'Time Taken': r.timeTaken,
      'Tab Switches': r.tabSwitches,
      'Fullscreen Exits': r.fullscreenExits,
      Status: r.status,
    }));
    exportToCsv('JIT_CodeArena_Student_Assessment_Report', csvData);
  };

  const handleExportProctoringIncidents = () => {
    const incidents = reportRows.filter((r) => r.tabSwitches > 0 || r.fullscreenExits > 0).map((r) => ({
      'Register Number': r.registerNumber,
      'Student Name': r.name,
      Department: r.department,
      'Tab Switches': r.tabSwitches,
      'Fullscreen Exits': r.fullscreenExits,
      Status: r.status,
      Action: 'Referred to Disciplinary Committee',
    }));
    if (incidents.length === 0) {
      alert('No anti-cheating incidents recorded in current assessment sessions.');
      return;
    }
    exportToCsv('JIT_Proctoring_Incident_Audit_Report', incidents);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            <span>Examination Reports & Data Export Center</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Generate and download certified college grade sheets and invigilation audit records
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportAllResults}
            disabled={reportRows.length === 0}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <Download className="w-4 h-4" />
            <span>Export Complete Student Results CSV</span>
          </button>
        </div>
      </div>

      {reportRows.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12">
          <EmptyState
            icon={FileSpreadsheet}
            title="No assessment results available yet"
            description="Assessment results will appear here once candidates complete their tests."
            actionText="Manage Tests"
            actionHref="/admin/tests"
          />
        </div>
      ) : (
        <>
          {/* Export Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Comprehensive Assessment CSV</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Includes candidate details, scores, percentage, completion times, and test breakdown.
                </p>
              </div>
              <button
                onClick={handleExportAllResults}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
              >
                Download CSV Report
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Anti-Cheating Audit Incident Report</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Filtered log of all tab switches, window deviations, and blocked clipboard events.
                </p>
              </div>
              <button
                onClick={handleExportProctoringIncidents}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
              >
                Export Security Incidents
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Department Performance Summary</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Aggregated GPA, pass rate, and topic averages formatted for college HOD review.
                </p>
              </div>
              <button
                onClick={handleExportAllResults}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
              >
                Download Department Summary
              </button>
            </div>
          </div>

          {/* Live Preview Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-2 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Export Table Preview (Live Synchronized)</span>
              </h2>
              <span className="text-xs text-slate-400">Showing {reportRows.length} Candidates</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-3">Reg No</th>
                    <th className="py-3 px-3">Name</th>
                    <th className="py-3 px-2">Dept</th>
                    <th className="py-3 px-2 text-center">Year</th>
                    <th className="py-3 px-3 text-right">Score</th>
                    <th className="py-3 px-3 text-center">Percentage</th>
                    <th className="py-3 px-3 text-center">Time Taken</th>
                    <th className="py-3 px-3 text-center">Violations</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {reportRows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 font-bold text-white">{r.registerNumber}</td>
                      <td className="py-3 px-3 font-sans text-slate-200">{r.name}</td>
                      <td className="py-3 px-2 text-slate-300">{r.department}</td>
                      <td className="py-3 px-2 text-center text-slate-400">{r.year}</td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-400">{r.score}</td>
                      <td className="py-3 px-3 text-center text-slate-300">{r.percentage}</td>
                      <td className="py-3 px-3 text-center text-slate-400">{r.timeTaken}</td>
                      <td className="py-3 px-3 text-center">
                        {r.tabSwitches + r.fullscreenExits > 0 ? (
                          <span className="text-rose-400 font-bold">
                            {r.tabSwitches + r.fullscreenExits} ({r.tabSwitches} tabs)
                          </span>
                        ) : (
                          <span className="text-emerald-400">Clean</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-sans text-xs text-slate-300">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
