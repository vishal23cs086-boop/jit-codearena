'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  AlertTriangle,
  Award,
  Users,
  Clock,
} from 'lucide-react';

const SCORE_DISTRIBUTION = [
  { range: '0 - 40%', count: 1 },
  { range: '41 - 60%', count: 3 },
  { range: '61 - 80%', count: 8 },
  { range: '81 - 90%', count: 14 },
  { range: '91 - 100%', count: 18 },
];

const QUESTION_FAIL_RATES = [
  { question: 'Longest Palindrome', failureRate: 42, attempts: 48 },
  { question: 'Max Subarray (Kadane)', failureRate: 35, attempts: 44 },
  { question: 'Valid Parentheses', failureRate: 18, attempts: 52 },
  { question: 'Two Sum', failureRate: 8, attempts: 56 },
];

const DEPT_PERFORMANCE = [
  { department: 'CSE (Year 3)', avgScore: 84.5, students: 45 },
  { department: 'AI&DS (Year 3)', avgScore: 81.2, students: 30 },
  { department: 'IT (Year 2)', avgScore: 78.0, students: 25 },
  { department: 'ECE (Year 2)', avgScore: 74.8, students: 20 },
];

export default function AdminAnalyticsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-400" />
          <span>Institutional Examination Analytics</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Aggregated cohort intelligence, difficulty analysis, and candidate failure points
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">
            Participation Rate
          </span>
          <div className="text-2xl font-bold text-emerald-400">96.8%</div>
          <span className="text-[11px] text-slate-500">116 of 120 participated</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">
            Cohort Average
          </span>
          <div className="text-2xl font-bold text-white">79.4 / 100</div>
          <span className="text-[11px] text-indigo-400">+4.2% vs last cycle</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">
            Most Challenging Question
          </span>
          <div className="text-xl font-bold text-amber-300">Longest Palindrome</div>
          <span className="text-[11px] text-rose-400">42% fail rate on hidden cases</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">
            Fastest Finish Time
          </span>
          <div className="text-2xl font-bold text-blue-400">34m 00s</div>
          <span className="text-[11px] text-slate-500">Candidate 22CS084</span>
        </div>
      </div>

      {/* Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <span>Score Distribution Frequency (Histogram)</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SCORE_DISTRIBUTION}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="range" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Bar dataKey="count" name="Students" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Most Failed Questions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Most Failed Questions (% Hidden Test Cases Failed)</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={QUESTION_FAIL_RATES} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" domain={[0, 50]} fontSize={11} />
                <YAxis dataKey="question" type="category" stroke="#94a3b8" fontSize={11} width={130} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Bar dataKey="failureRate" name="Failure %" fill="#f43f5e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department vs Performance */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 lg:col-span-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Department & Year Comparative Performance</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DEPT_PERFORMANCE}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="department" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Bar dataKey="avgScore" name="Average Marks" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
