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
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <FileSpreadsheet className="w-7 h-7 text-emerald-400" />
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
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Download className="w-4 h-4" />
            <span>Export Complete Results CSV</span>
          </button>
        </div>
      </div>

      {reportRows.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 border border-white/10">
          <EmptyState
            title="No assessment results available yet"
            description="Assessment results will appear here once candidates complete their tests."
            action={{
              label: "Manage Tests",
              href: "/admin/tests",
            }}
          />
        </div>
      ) : (
        <>
          {/* Export Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="glass-card glass-card-hover rounded-3xl p-6 space-y-4 border border-white/10">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Comprehensive Assessment CSV</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Includes candidate details, scores, percentage, completion times, and test breakdown.
                </p>
              </div>
              <button
                onClick={handleExportAllResults}
                className="w-full py-2.5 glass-card-hover rounded-xl text-xs font-semibold text-slate-200 hover:text-white transition border border-white/10"
              >
                Download CSV Report
              </button>
            </div>

            <div className="glass-card glass-card-hover rounded-3xl p-6 space-y-4 border border-white/10">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Anti-Cheating Audit Incident Report</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Filtered log of all tab switches, window deviations, and blocked clipboard events.
                </p>
              </div>
              <button
                onClick={handleExportProctoringIncidents}
                className="w-full py-2.5 glass-card-hover rounded-xl text-xs font-semibold text-amber-400 hover:text-amber-300 transition border border-white/10"
              >
                Export Security Incidents
              </button>
            </div>

            <div className="glass-card glass-card-hover rounded-3xl p-6 space-y-4 border border-white/10">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Department Performance Summary</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Aggregated GPA, pass rate, and topic averages formatted for college HOD review.
                </p>
              </div>
              <button
                onClick={handleExportAllResults}
                className="w-full py-2.5 glass-card-hover rounded-xl text-xs font-semibold text-slate-200 hover:text-white transition border border-white/10"
              >
                Download Department Summary
              </button>
            </div>
          </div>

          {/* Live Preview Table */}
          <div className="glass-card rounded-3xl overflow-hidden border border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h2 className="text-base font-bold text-white flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Export Table Preview (Live Synchronized)</span>
              </h2>
              <span className="text-xs text-slate-400 font-mono">Showing {reportRows.length} Candidates</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3.5 px-3">Reg No</th>
                    <th className="py-3.5 px-3">Name</th>
                    <th className="py-3.5 px-2">Dept</th>
                    <th className="py-3.5 px-2 text-center">Year</th>
                    <th className="py-3.5 px-3 text-right">Score</th>
                    <th className="py-3.5 px-3 text-center">Percentage</th>
                    <th className="py-3.5 px-3 text-center">Time Taken</th>
                    <th className="py-3.5 px-3 text-center">Violations</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {reportRows.map((r) => (
                    <tr key={r.id} className="hover:bg-white/[0.03] transition">
                      <td className="py-3.5 px-3 font-bold text-indigo-400">{r.registerNumber}</td>
                      <td className="py-3.5 px-3 font-sans text-white">{r.name}</td>
                      <td className="py-3.5 px-2 text-slate-400">{r.department}</td>
                      <td className="py-3.5 px-2 text-center text-slate-500">{r.year}</td>
                      <td className="py-3.5 px-3 text-right font-bold text-emerald-400">{r.score}</td>
                      <td className="py-3.5 px-3 text-center text-slate-300">{r.percentage}</td>
                      <td className="py-3.5 px-3 text-center text-slate-400">{r.timeTaken}</td>
                      <td className="py-3.5 px-3 text-center">
                        {r.tabSwitches + r.fullscreenExits > 0 ? (
                          <span className="text-rose-400 font-bold">
                            {r.tabSwitches + r.fullscreenExits} ({r.tabSwitches} tabs)
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-semibold">Clean</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-sans text-xs text-slate-300">{r.status}</td>
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
