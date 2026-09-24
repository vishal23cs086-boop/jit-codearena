'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { MOCK_TESTS } from '@/lib/mockData';
import {
  GraduationCap,
  Award,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Code2,
  FileCode,
  ShieldCheck,
} from 'lucide-react';

export default function StudentDashboardPage() {
  const { user } = useAuth();

  const activeTest = MOCK_TESTS.find((t) => t.status === 'active');
  const upcomingTest = MOCK_TESTS.find((t) => t.status === 'published');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Student Profile Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xl shadow-inner">
              {user?.full_name ? user.full_name.charAt(0) : 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">{user?.full_name || 'Student Candidate'}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  {user?.register_number || '22CS084'}
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1">
                Department of {user?.department || 'CSE'} • Year {user?.year || 3} • Section {user?.section || 'A'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{user?.email || 'student@jit.edu.in'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/student/analytics"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-2"
            >
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
              <span>View Performance Analytics</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Average Score</span>
            <Award className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">88.5%</div>
          <span className="text-[11px] text-emerald-400 font-medium">Top 5% in {user?.department || 'CSE'}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Problems Solved</span>
            <Code2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">14 / 16</div>
          <span className="text-[11px] text-slate-400">87.5% completion rate</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Completed Tests</span>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">3 Tests</div>
          <span className="text-[11px] text-slate-400">All submitted on time</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Department Rank</span>
            <GraduationCap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">#04</div>
          <span className="text-[11px] text-slate-400">Out of 120 enrolled students</span>
        </div>
      </div>

      {/* Available Active Test Banner */}
      {activeTest && (
        <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border-2 border-indigo-500/40 rounded-2xl p-6 shadow-2xl relative">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>ASSESSMENT ACTIVE NOW</span>
              </div>
              <h2 className="text-xl font-bold text-white">{activeTest.title}</h2>
              <p className="text-sm text-slate-300 leading-relaxed">{activeTest.description}</p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2 font-medium">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  Duration: {activeTest.duration_minutes} Minutes
                </span>
                <span className="flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-indigo-400" />
                  4 Python Coding Problems
                </span>
                <span className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-indigo-400" />
                  Total: {activeTest.total_marks} Marks
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  Proctored Environment
                </span>
              </div>
            </div>

            <div className="flex-shrink-0">
              <Link
                href={`/student/test/${activeTest.id}/instructions`}
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition shadow-lg shadow-indigo-600/30 text-sm"
              >
                <span>Read Instructions & Start</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming & Completed Tests Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Tests */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Upcoming Scheduled Assessments</span>
            </h3>
            <span className="text-xs text-slate-400">1 Upcoming</span>
          </div>

          {upcomingTest ? (
            <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-white text-sm">{upcomingTest.title}</h4>
                  <p className="text-xs text-slate-400 mt-1">{upcomingTest.description}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                  Scheduled
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800 font-mono">
                <span>Duration: {upcomingTest.duration_minutes}m</span>
                <span>Marks: {upcomingTest.total_marks}</span>
                <span>Year: 2 & 3 (CSE, IT, AI&DS)</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-4 text-center">No upcoming tests scheduled.</p>
          )}
        </div>

        {/* Previous Assessment Results */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Completed Assessment Results</span>
            </h3>
            <span className="text-xs text-slate-400">Recent Completed</span>
          </div>

          <div className="space-y-3">
            <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-white text-sm">
                  Python Basics & Data Structures Mock Test
                </h4>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>Completed Sep 18, 2026</span>
                  <span>•</span>
                  <span className="text-indigo-400 font-medium">Rank #1 (Fastest completion)</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-emerald-400">96 / 100</div>
                <Link
                  href="/student/test/test-jit-py-2026/result"
                  className="text-[11px] text-indigo-400 hover:underline"
                >
                  View Scorecard →
                </Link>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-white text-sm">
                  Algorithms & Sorting Assessment (Python)
                </h4>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>Completed Sep 05, 2026</span>
                  <span>•</span>
                  <span className="text-slate-400 font-medium">Rank #3</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-emerald-400">92 / 100</div>
                <span className="text-[11px] text-slate-500">Archived</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
