'use client';

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { fetchAttempts } from '@/lib/db';
import { TestAttempt } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  TrendingUp,
  Award,
  Clock,
  Target,
  CheckCircle2,
  PieChart as PieIcon,
  BarChart2,
  Loader2,
} from 'lucide-react';

export default function StudentAnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentAttempts, setStudentAttempts] = useState<TestAttempt[]>([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const allAttempts = await fetchAttempts();
        const userAttempts = allAttempts.filter(
          (a) =>
            a.student_id === user?.id ||
            a.students?.register_number === user?.register_number ||
            a.id.includes(user?.register_number || '')
        );
        setStudentAttempts(userAttempts);
      } catch (err) {
        console.error('Failed to load student analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user?.id, user?.register_number]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (studentAttempts.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EmptyState
          icon={TrendingUp}
          title="No Assessment Analytics Available"
          description="Analytics will appear after assessment activity is recorded."
          actionText="View Available Assessments"
          actionHref="/student/assessments"
        />
      </div>
    );
  }

  // Calculate real performance metrics from student's attempts
  const completedAttempts = studentAttempts.filter(
    (a) => a.status === 'submitted' || a.status === 'auto_submitted'
  );

  const totalScore = completedAttempts.reduce((acc, a) => acc + (a.score || 0), 0);
  const avgPercentage = completedAttempts.length > 0
    ? Math.round(completedAttempts.reduce((acc, a) => acc + (a.percentage || 0), 0) / completedAttempts.length)
    : 0;

  const avgTimeTakenSecs = completedAttempts.length > 0
    ? Math.round(completedAttempts.reduce((acc, a) => acc + (a.time_taken_seconds || 0), 0) / completedAttempts.length)
    : 0;
  const avgTimeMinutes = Math.floor(avgTimeTakenSecs / 60);

  const bestScore = completedAttempts.reduce((max, a) => Math.max(max, a.score || 0), 0);

  // Chart data from real attempts
  const scoreHistoryData = completedAttempts
    .slice()
    .reverse()
    .map((a, idx) => ({
      test: a.tests?.title ? (a.tests.title.length > 20 ? a.tests.title.slice(0, 18) + '...' : a.tests.title) : `Test ${idx + 1}`,
      score: a.score || 0,
      percentage: a.percentage || 0,
    }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-indigo-400" />
          <span>Student Progress & Competency Analytics</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Performance trajectory for {user?.full_name} ({user?.register_number})
        </p>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">
            Average Score
          </span>
          <div className="text-2xl font-bold text-emerald-400">{avgPercentage}%</div>
          <span className="text-[11px] text-slate-500">Across {completedAttempts.length} completed assessments</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">
            Avg Completion Time
          </span>
          <div className="text-2xl font-bold text-white">{avgTimeMinutes}m</div>
          <span className="text-[11px] text-indigo-400">Recorded test duration</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">
            Assessments Completed
          </span>
          <div className="text-2xl font-bold text-indigo-400">{completedAttempts.length}</div>
          <span className="text-[11px] text-slate-500">Verified official submissions</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">
            Highest Score
          </span>
          <div className="text-2xl font-bold text-amber-400">{bestScore.toFixed(1)}</div>
          <span className="text-[11px] text-slate-500">Personal best result</span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score History Line Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-400" />
              <span>Assessment Score History</span>
            </h3>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scoreHistoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="test" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Line
                  type="monotone"
                  dataKey="percentage"
                  name="Score (%)"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Assessment Marks Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-emerald-400" />
              <span>Marks Obtained per Assessment</span>
            </h3>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreHistoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="test" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Bar dataKey="score" name="Marks" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
