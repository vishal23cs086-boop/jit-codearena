'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { fetchTests, fetchAttempts } from '@/lib/db';
import { Test, TestAttempt } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  FileCode,
  Clock,
  Award,
  Calendar,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function StudentAssessmentsPage() {
  const { user } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [allTests, allAttempts] = await Promise.all([
          fetchTests(),
          fetchAttempts(),
        ]);
        setTests(allTests);
        if (user) {
          setAttempts(allAttempts.filter((a) => a.student_id === user.id));
        }
      } catch (e) {
        console.warn('Error loading assessments:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const getStatus = (test: Test): 'Upcoming' | 'Available' | 'In Progress' | 'Completed' | 'Expired' => {
    const attempt = attempts.find((a) => a.test_id === test.id);
    if (attempt?.status === 'submitted' || attempt?.status === 'auto_submitted') {
      return 'Completed';
    }
    if (attempt?.status === 'in_progress') {
      return 'In Progress';
    }

    const now = new Date();
    const startTime = new Date(test.start_time);
    const endTime = new Date(test.end_time);

    if (now < startTime) return 'Upcoming';
    if (now > endTime) return 'Expired';
    if (test.status === 'active') return 'Available';
    if (test.status === 'published') return 'Upcoming';
    return 'Expired';
  };

  const getStatusBadge = (status: ReturnType<typeof getStatus>) => {
    switch (status) {
      case 'Available':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Available Now
          </span>
        );
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            In Progress
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            Completed
          </span>
        );
      case 'Upcoming':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            Upcoming
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
            Expired
          </span>
        );
    }
  };

  // Eligibility check
  const isEligible = (test: Test) => {
    if (!user) return false;
    const yearMatch = !test.eligible_years?.length || test.eligible_years.includes(user.year);
    const deptMatch =
      !test.eligible_departments?.length ||
      test.eligible_departments.some((d) => d.toUpperCase() === user.department?.toUpperCase());
    return yearMatch && deptMatch;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileCode className="w-6 h-6 text-indigo-600" />
          <span>Institutional Coding Assessments</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Scheduled examinations and laboratory assessments for your academic cohort
        </p>
      </div>

      {tests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tests.map((test) => {
            const status = getStatus(test);
            const eligible = isEligible(test);
            const canStart = eligible && (status === 'Available' || status === 'In Progress');

            return (
              <div
                key={test.id}
                className="glass-card-hover rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-4 shadow-sm border border-slate-200/90"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    {getStatusBadge(status)}
                    <span className="text-xs text-slate-500 font-mono">
                      {test.questions?.length || 0} Questions
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-2">{test.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {test.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-mono bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      Duration: {test.duration_minutes}m
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-emerald-600" />
                      Total: {test.total_marks} Marks
                    </span>
                    <span className="col-span-2 text-[11px] text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Window: {new Date(test.start_time).toLocaleDateString()} – {new Date(test.end_time).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500">
                    {eligible ? (
                      <span className="text-emerald-600 font-medium">✓ Eligible Candidate</span>
                    ) : (
                      <span className="text-rose-600 font-medium">✕ Department / Year Restriction</span>
                    )}
                  </div>

                  {status === 'Completed' ? (
                    <Link
                      href={`/student/test/${test.id}/result`}
                      className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition border border-slate-200 shadow-xs"
                    >
                      View Result →
                    </Link>
                  ) : canStart ? (
                    <Link
                      href={`/student/test/${test.id}/instructions`}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                    >
                      <span>{status === 'In Progress' ? 'Resume Assessment' : 'Start Assessment'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl text-xs font-semibold cursor-not-allowed border border-slate-200"
                    >
                      {status === 'Upcoming' ? 'Not Started Yet' : status === 'Expired' ? 'Assessment Closed' : 'Ineligible'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No institutional assessments found"
          description="Your scheduled tests will appear here once published by the examination coordinator."
        />
      )}
    </div>
  );
}
