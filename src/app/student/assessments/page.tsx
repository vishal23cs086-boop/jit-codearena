'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  FileCode,
  Clock,
  Award,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';

interface StudentAssessmentItem {
  id: string;
  title: string;
  description: string;
  code: string;
  assessment_code: string;
  instructions: string;
  year: number;
  duration: number;
  duration_minutes: number;
  total_marks: number;
  passing_marks: number;
  question_count: number;
  start_time: string;
  end_time: string;
  status: string;
  calculated_status: 'Available' | 'In Progress' | 'Completed' | 'Upcoming' | 'Expired';
  attempt?: {
    id: string;
    status: string;
    score: number;
    max_score: number;
    start_time: string;
    end_time: string | null;
  } | null;
}

export default function StudentAssessmentsPage() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<StudentAssessmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch('/api/student/assessments');
        const data = await res.json();
        if (data.success && Array.isArray(data.assessments)) {
          setAssessments(data.assessments);
        } else {
          setAssessments([]);
        }
      } catch (e) {
        console.warn('Error loading student assessments:', e);
        setAssessments([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const getStatusBadge = (status: string) => {
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
            Closed / Expired
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileCode className="w-6 h-6 text-indigo-600" />
          <span>Institutional Coding Assessments</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Official departmental assessments for your academic cohort ({user?.year === 2 ? '2nd Year' : user?.year === 3 ? '3rd Year' : 'Candidate'})
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading your eligible assessments from examination database...</p>
        </div>
      ) : assessments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assessments.map((test) => {
            const status = test.calculated_status;
            const canStart = status === 'Available' || status === 'In Progress';

            return (
              <div
                key={test.id}
                className="glass-card-hover rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-4 shadow-sm border border-slate-200/90"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    {getStatusBadge(status)}
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                        Number(test.year) === 3
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {Number(test.year) === 3 ? '3rd Year Assessment' : '2nd Year Assessment'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-1">{test.title}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 font-mono text-[10px] rounded border border-slate-200">
                      {test.assessment_code || test.code || test.id}
                    </span>
                    <span className="text-[11px] text-slate-400">• Passing: {test.passing_marks} / {test.total_marks}</span>
                  </div>

                  {test.description ? (
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {test.description}
                    </p>
                  ) : null}

                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-mono bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      Duration: {test.duration_minutes}m
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-emerald-600" />
                      Total: {test.total_marks} Marks
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      Questions: {test.question_count}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      Pass: {test.passing_marks} Marks
                    </span>
                    <span className="col-span-2 text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Window: {test.start_time ? new Date(test.start_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Immediate'} – {test.end_time ? new Date(test.end_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Continuous'}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500">
                    <span className="text-emerald-600 font-medium">✓ Eligible Candidate ({user?.year === 2 ? '2nd' : '3rd'} Year)</span>
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
                      {status === 'Upcoming' ? 'Starts Soon' : 'Assessment Closed'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No assessments available"
          description="Your scheduled tests will appear here once published by the examination coordinator."
        />
      )}
    </div>
  );
}
