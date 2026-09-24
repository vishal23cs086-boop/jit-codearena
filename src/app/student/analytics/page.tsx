'use client';

import React from 'react';
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useAuth } from '@/context/AuthContext';
import {
  TrendingUp,
  Award,
  Clock,
  Target,
  CheckCircle2,
  PieChart as PieIcon,
  BarChart2,
} from 'lucide-react';

const SCORE_HISTORY_DATA = [
  { test: 'Assessment 1 (Basics)', score: 78, average: 65 },
  { test: 'Assessment 2 (Strings)', score: 85, average: 70 },
  { test: 'Assessment 3 (OOP)', score: 92, average: 74 },
  { test: 'Assessment 4 (DSA Stack)', score: 88, average: 72 },
  { test: 'Assessment 5 (Current)', score: 96, average: 78 },
];

const TOPIC_PERFORMANCE_DATA = [
  { topic: 'Lists & Arrays', proficiency: 98 },
  { topic: 'Strings', proficiency: 92 },
  { topic: 'Stack DSA', proficiency: 94 },
  { topic: 'Algorithms (Greedy)', proficiency: 86 },
  { topic: 'Recursion', proficiency: 80 },
  { topic: 'OOP Python', proficiency: 90 },
];

const DIFFICULTY_DATA = [
  { name: 'Easy', value: 8, color: '#10b981' },
  { name: 'Medium', value: 5, color: '#f59e0b' },
  { name: 'Hard', value: 1, color: '#f43f5e' },
];

export default function StudentAnalyticsPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-indigo-400" />
          <span>Student Progress & Competency Analytics</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Candidate performance trajectory for {user?.full_name} ({user?.register_number})
        </p>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">
            Overall Accuracy
          </span>
          <div className="text-2xl font-bold text-emerald-400">92.4%</div>
          <span className="text-[11px] text-slate-500">Based on test case pass rate</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">
            Avg Coding Time
          </span>
          <div className="text-2xl font-bold text-white">8m 32s</div>
          <span className="text-[11px] text-indigo-400">22% faster than class average</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">
            Problems Solved
          </span>
          <div className="text-2xl font-bold text-indigo-400">14 / 16</div>
          <span className="text-[11px] text-slate-500">87.5% syllabus completion</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">
            Top Scoring Topic
          </span>
          <div className="text-2xl font-bold text-amber-400">Lists & DSA</div>
          <span className="text-[11px] text-slate-500">98% success rate</span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score History Line Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-400" />
              <span>Assessment Score History (You vs Class Average)</span>
            </h3>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={SCORE_HISTORY_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="test" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[40, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  name="Your Score"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="average"
                  name="Class Average"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Topic Performance Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-emerald-400" />
              <span>Topic Proficiency Score (%)</span>
            </h3>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={TOPIC_PERFORMANCE_DATA} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" domain={[0, 100]} fontSize={11} />
                <YAxis dataKey="topic" type="category" stroke="#94a3b8" fontSize={11} width={110} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Bar dataKey="proficiency" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Difficulty Breakdown Pie Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-purple-400" />
              <span>Problems Solved by Difficulty Level</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DIFFICULTY_DATA.map((item) => (
              <div
                key={item.name}
                className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <span className="text-xs text-slate-400 block">{item.name} Problems</span>
                  <div className="text-xl font-bold text-white mt-1">{item.value} Solved</div>
                </div>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs"
                  style={{ backgroundColor: `${item.color}20`, color: item.color }}
                >
                  {Math.round((item.value / 14) * 100)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
