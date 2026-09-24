'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Users,
  Clock,
  Loader2,
} from 'lucide-react';
import { fetchAttempts, fetchStudents } from '@/lib/db';
import { TestAttempt, StudentProfile } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';

export default function AdminAnalyticsPage() {
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
        console.error('Failed to load admin analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (attempts.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EmptyState
          title="No assessment data available yet"
          description="Analytics will appear after assessment activity is recorded."
          action={{
            label: "View Assessments",
            href: "/admin/tests",
          }}
        />
      </div>
    );
  }

  // Real calculations
  const totalAttempts = attempts.length;
  const totalStudents = students.length || totalAttempts;
  const participationRate = totalStudents > 0
    ? Math.min(100, Math.round((totalAttempts / totalStudents) * 100))
    : 100;

  const totalScoreSum = attempts.reduce((acc, a) => acc + (a.score || 0), 0);
  const cohortAverage = (totalScoreSum / totalAttempts).toFixed(1);

  const fastestAttempt = attempts.reduce((fastest, a) => {
    if (!a.time_taken_seconds) return fastest;
    if (!fastest || a.time_taken_seconds < (fastest.time_taken_seconds || 999999)) return a;
    return fastest;
  }, null as TestAttempt | null);

  const fastestMinutes = fastestAttempt ? Math.floor((fastestAttempt.time_taken_seconds || 0) / 60) : 0;
  const fastestSeconds = fastestAttempt ? (fastestAttempt.time_taken_seconds || 0) % 60 : 0;
  const fastestTimeText = fastestAttempt ? `${fastestMinutes}m ${fastestSeconds}s` : 'N/A';

  // Real Score Distribution Histogram
  const distributionMap: Record<string, number> = {
    '0 - 40%': 0,
    '41 - 60%': 0,
    '61 - 80%': 0,
    '81 - 90%': 0,
    '91 - 100%': 0,
  };

  attempts.forEach((a) => {
    const p = a.percentage || 0;
    if (p <= 40) distributionMap['0 - 40%'] += 1;
    else if (p <= 60) distributionMap['41 - 60%'] += 1;
    else if (p <= 80) distributionMap['61 - 80%'] += 1;
    else if (p <= 90) distributionMap['81 - 90%'] += 1;
    else distributionMap['91 - 100%'] += 1;
  });

  const scoreDistributionData = Object.entries(distributionMap).map(([range, count]) => ({
    range,
    count,
  }));

  // Real Department-wise Performance
  const deptMap: Record<string, { totalScore: number; count: number }> = {};
  attempts.forEach((a) => {
    const dept = a.students?.department || 'General';
    if (!deptMap[dept]) {
      deptMap[dept] = { totalScore: 0, count: 0 };
    }
    deptMap[dept].totalScore += a.score || 0;
    deptMap[dept].count += 1;
  });

  const deptPerformanceData = Object.entries(deptMap).map(([department, data]) => ({
    department,
    avgScore: Math.round(data.totalScore / data.count),
    students: data.count,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-indigo-400" />
          <span>Institutional Examination Analytics</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Aggregated cohort intelligence, score distribution, and department averages
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card glass-card-hover rounded-2xl p-5 border border-white/10">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">
            Participation Rate
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">{participationRate}%</div>
          <span className="text-[11px] text-slate-500 mt-1 block">{totalAttempts} candidates participated</span>
        </div>

        <div className="glass-card glass-card-hover rounded-2xl p-5 border border-white/10">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">
            Cohort Average
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">{cohortAverage} <span className="text-sm font-semibold text-slate-400">Marks</span></div>
          <span className="text-[11px] text-indigo-400 font-medium mt-1 block">Mean assessment score</span>
        </div>

        <div className="glass-card glass-card-hover rounded-2xl p-5 border border-white/10">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">
            Active Candidates
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-400">{totalAttempts}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Total sessions tracked</span>
        </div>

        <div className="glass-card glass-card-hover rounded-2xl p-5 border border-white/10">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">
            Fastest Finish Time
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-blue-400">{fastestTimeText}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {fastestAttempt?.students?.register_number || 'Earliest completion'}
          </span>
        </div>
      </div>

      {/* Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <div className="glass-card rounded-3xl p-6 sm:p-7 space-y-5 border border-white/10">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <span>Score Distribution Frequency (Histogram)</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreDistributionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="range" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1020',
                    borderColor: 'rgba(255,255,255,0.1)',
                    color: '#f8fafc',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                  }}
                />
                <Bar dataKey="count" name="Students" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department vs Performance */}
        <div className="glass-card rounded-3xl p-6 sm:p-7 space-y-5 border border-white/10">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Department Comparative Performance</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="department" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1020',
                    borderColor: 'rgba(255,255,255,0.1)',
                    color: '#f8fafc',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                  }}
                />
                <Bar dataKey="avgScore" name="Average Marks" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
