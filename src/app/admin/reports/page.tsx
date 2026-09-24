'use client';

import React, { useState } from 'react';
import { exportToCsv } from '@/lib/utils';
import {
  FileSpreadsheet,
  Download,
  FileText,
  ShieldAlert,
  Users,
  CheckCircle2,
} from 'lucide-react';

const REPORT_ROWS = [
  {
    registerNumber: '22CS084',
    name: 'Harish Kumar S',
    department: 'CSE',
    year: 3,
    test: 'JIT Python Assessment 2026 - Cycle 1',
    score: 96.5,
    percentage: '96.5%',
    startTime: '10:02:00 AM',
    completionTime: '10:36:12 AM',
    timeTaken: '34m 12s',
    questionsSolved: '4 / 4',
    submissions: 5,
    tabSwitches: 0,
    fullscreenExits: 0,
    status: 'Completed (Rank #1)',
  },
  {
    registerNumber: '23EC031',
    name: 'Ananya Meenakshi',
    department: 'ECE',
    year: 2,
    test: 'JIT Python Assessment 2026 - Cycle 1',
    score: 92.0,
    percentage: '92.0%',
    startTime: '10:01:10 AM',
    completionTime: '10:39:20 AM',
    timeTaken: '38m 10s',
    questionsSolved: '4 / 4',
    submissions: 5,
    tabSwitches: 0,
    fullscreenExits: 0,
    status: 'Completed (Rank #2)',
  },
  {
    registerNumber: '23IT045',
    name: 'Priya Sundaram',
    department: 'IT',
    year: 2,
    test: 'JIT Python Assessment 2026 - Cycle 1',
    score: 72.0,
    percentage: '72.0%',
    startTime: '10:05:00 AM',
    completionTime: '10:44:05 AM',
    timeTaken: '39m 05s',
    questionsSolved: '3 / 4',
    submissions: 6,
    tabSwitches: 1,
    fullscreenExits: 0,
    status: 'Completed (Rank #3)',
  },
  {
    registerNumber: '22AD012',
    name: 'Vignesh Raman',
    department: 'AI&DS',
    year: 3,
    test: 'JIT Python Assessment 2026 - Cycle 1',
    score: 48.0,
    percentage: '48.0%',
    startTime: '10:08:00 AM',
    completionTime: 'In Progress',
    timeTaken: '40m 00s',
    questionsSolved: '2 / 4',
    submissions: 4,
    tabSwitches: 3,
    fullscreenExits: 2,
    status: 'Suspicious (Flagged)',
  },
  {
    registerNumber: '22CS102',
    name: 'Karthikeyan P',
    department: 'CSE',
    year: 3,
    test: 'JIT Python Assessment 2026 - Cycle 1',
    score: 0.0,
    percentage: '0.0%',
    startTime: 'Pending',
    completionTime: 'Pending',
    timeTaken: '0m 00s',
    questionsSolved: '0 / 4',
    submissions: 0,
    tabSwitches: 0,
    fullscreenExits: 0,
    status: 'Not Started',
  },
];

export default function AdminReportsPage() {
  const handleExportAllResults = () => {
    const csvData = REPORT_ROWS.map((r) => ({
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
      'Questions Solved': r.questionsSolved,
      Submissions: r.submissions,
      'Tab Switches': r.tabSwitches,
      'Fullscreen Exits': r.fullscreenExits,
      Status: r.status,
    }));
    exportToCsv('JIT_CodeArena_Student_Assessment_Report', csvData);
  };

  const handleExportProctoringIncidents = () => {
    const incidents = REPORT_ROWS.filter((r) => r.tabSwitches > 0 || r.fullscreenExits > 0).map((r) => ({
      'Register Number': r.registerNumber,
      'Student Name': r.name,
      Department: r.department,
      'Tab Switches': r.tabSwitches,
      'Fullscreen Exits': r.fullscreenExits,
      Status: r.status,
      Action: 'Referred to Disciplinary Committee',
    }));
    exportToCsv('JIT_Proctoring_Incident_Audit_Report', incidents);
  };

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
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <Download className="w-4 h-4" />
            <span>Export Complete Student Results CSV</span>
          </button>
        </div>
      </div>

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
          <span className="text-xs text-slate-400">Showing {REPORT_ROWS.length} Candidates</span>
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
                <th className="py-3 px-3 text-center">Solved</th>
                <th className="py-3 px-3 text-center">Violations</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {REPORT_ROWS.map((r) => (
                <tr key={r.registerNumber} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3 font-bold text-white">{r.registerNumber}</td>
                  <td className="py-3 px-3 font-sans text-slate-200">{r.name}</td>
                  <td className="py-3 px-2 text-slate-300">{r.department}</td>
                  <td className="py-3 px-2 text-center text-slate-400">{r.year}</td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-400">{r.score}</td>
                  <td className="py-3 px-3 text-center text-slate-300">{r.percentage}</td>
                  <td className="py-3 px-3 text-center text-slate-400">{r.timeTaken}</td>
                  <td className="py-3 px-3 text-center text-indigo-300">{r.questionsSolved}</td>
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
    </div>
  );
}
