'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  FileCode,
  Award,
  AlertTriangle,
  Maximize2,
  Lock,
  ArrowRight,
  Loader2,
  Layers,
  Sparkles,
} from 'lucide-react';

interface AssessmentDetails {
  id: string;
  title: string;
  description: string;
  code: string;
  assessment_code: string;
  instructions: string;
  year: number;
  duration_minutes: number;
  total_marks: number;
  passing_marks: number;
  question_count: number;
  start_time: string;
  end_time: string;
  status: string;
  calculated_status: string;
}

export default function TestInstructionsPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [test, setTest] = useState<AssessmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const testId = typeof params?.id === 'string' ? params.id : '';

  useEffect(() => {
    async function loadTest() {
      if (!testId) return;
      setLoading(true);
      setErrorMessage(null);
      try {
        const res = await fetch(`/api/student/assessments/${testId}`);
        const data = await res.json();
        if (res.ok && data.success && data.assessment) {
          setTest(data.assessment);
        } else {
          setTest(null);
          setErrorMessage(data.error || 'Assessment not found or not available for your academic year.');
        }
      } catch (err) {
        console.error('Error loading test:', err);
        setTest(null);
        setErrorMessage('Failed to load assessment details from server.');
      } finally {
        setLoading(false);
      }
    }
    loadTest();
  }, [testId]);

  const isYearMismatch = Boolean(test?.year && user?.year && test.year !== user.year);

  const handleStartExam = async () => {
    if (!agreed || !test || isYearMismatch) return;

    // Request fullscreen on start
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      }
    } catch {
      // Proceed even if browser blocks immediate call
    }

    router.push(`/student/test/${test.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (errorMessage || !test) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Assessment Unavailable</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          {errorMessage || 'The requested assessment could not be loaded or is not available for your cohort.'}
        </p>
        <div>
          <button
            onClick={() => router.push('/student/assessments')}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            Return to My Assessments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 w-full space-y-6">
      {/* Year Mismatch Warning Banner */}
      {isYearMismatch && (
        <div className="p-5 bg-rose-50 border border-rose-300 rounded-3xl text-rose-900 shadow-sm flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-rose-950 flex items-center gap-2">
              <span>Access Denied (403): Academic Year Mismatch</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-200 text-rose-800">
                RESTRICTED
              </span>
            </h3>
            <p className="text-xs text-rose-800 leading-relaxed">
              This assessment is configured strictly for <strong>{test?.year === 2 ? '2nd' : '3rd'} Year</strong> candidates only.
              You are authenticated as a <strong>{user?.year === 2 ? '2nd' : '3rd'} Year</strong> candidate.
              Server-side security policies prevent cross-year assessment attempts.
            </p>
            <div className="pt-2">
              <button
                onClick={() => router.push('/student/assessments')}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-semibold transition shadow-xs"
              >
                Return to My Assessments
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Banner */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm border border-slate-200/90 relative overflow-hidden bg-white">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-100/50 blur-[90px] pointer-events-none rounded-full" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-16 h-16 p-2 bg-slate-50 border border-slate-200 rounded-2xl shrink-0 shadow-xs flex items-center justify-center">
            <img
              src="/jit-logo.png"
              alt="Jansons Institute of Technology Crest"
              className="w-full h-full object-contain filter drop-shadow-sm"
            />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-1 shadow-xs">
              <FileCode className="w-3.5 h-3.5 text-indigo-600" />
              <span>JANSONS INSTITUTE OF TECHNOLOGY • OFFICIAL EXAMINATION</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{test?.title}</h1>
              {test?.year && (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    test.year === 2
                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                      : 'bg-purple-50 text-purple-700 border-purple-200'
                  }`}
                >
                  {test.year === 2 ? '2nd Year Assessment' : '3rd Year Assessment'}
                </span>
              )}
            </div>
          </div>
        </div>

        {test?.description ? (
          <p className="text-sm text-slate-600 leading-relaxed relative z-10">{test.description}</p>
        ) : null}

        {/* Candidate & Assessment autoritative details */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono relative z-10">
          <div>
            <span className="text-slate-500 font-sans block mb-0.5 text-[11px]">Candidate:</span>
            <span className="text-slate-900 font-bold text-xs block truncate">{user?.full_name || 'Candidate'}</span>
            <span className="text-indigo-600 font-bold text-[11px] block">{user?.register_number}</span>
          </div>
          <div>
            <span className="text-slate-500 font-sans block mb-0.5 text-[11px]">Assessment Code:</span>
            <span className="text-slate-900 font-bold text-xs block">{test.assessment_code || test.code}</span>
            <span className="text-slate-500 text-[11px] block">Year {test.year}</span>
          </div>
          <div>
            <span className="text-slate-500 font-sans block mb-0.5 text-[11px]">Duration & Questions:</span>
            <span className="text-indigo-600 font-bold text-xs block">{test.duration_minutes} Minutes</span>
            <span className="text-slate-600 text-[11px] block">{test.question_count} Questions</span>
          </div>
          <div>
            <span className="text-slate-500 font-sans block mb-0.5 text-[11px]">Marks & Passing:</span>
            <span className="text-emerald-600 font-bold text-xs block">Total: {test.total_marks}</span>
            <span className="text-slate-600 text-[11px] block">Passing: {test.passing_marks}</span>
          </div>
        </div>
      </div>

      {/* Rules & Guidelines */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-5 shadow-sm border border-slate-200/90 bg-white">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
          <span>Assessment Rules & Anti-Cheating Guidelines</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
            <div className="font-semibold text-slate-900 flex items-center gap-2">
              <Maximize2 className="w-4 h-4 text-indigo-600" />
              <span>1. Mandatory Fullscreen Mode</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              The assessment must be taken in full-screen mode. Exiting fullscreen at any point triggers a security warning and increments your event log count.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
            <div className="font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>2. Tab Switching Prohibited</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Do not switch tabs, minimize your window, or open other applications. Every tab transition is recorded with timestamp to the invigilator dashboard.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
            <div className="font-semibold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-600" />
              <span>3. Clipboard Restrictions</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Copying, cutting, and pasting code are strictly blocked. Code must be authored directly in the IDE.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
            <div className="font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>4. Server-Controlled Timer & Auto-Submit</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Your test duration is {test.duration_minutes} minutes. Your progress is auto-saved periodically. If time elapses, your code will be automatically finalized and submitted.
            </p>
          </div>
        </div>

        {/* Warning disclaimer */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 leading-relaxed">
          <strong>Notice:</strong> Browser deterrents and telemetry are active to preserve examination integrity. Candidates involved in unauthorized practices will be reported directly to the Examination Disciplinary Cell.
        </div>

        {/* Honor Code Checkbox */}
        <div className="pt-3 border-t border-slate-100">
          <label className={`flex items-start gap-3 ${isYearMismatch ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer group'}`}>
            <input
              type="checkbox"
              checked={agreed}
              disabled={isYearMismatch}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded text-indigo-600 bg-white border-slate-300 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
            />
            <span className="text-xs text-slate-600 group-hover:text-slate-900 leading-relaxed">
              I acknowledge that I am attempting this test independently without using external AI, web search, or unauthorized materials. I agree to abide by the JIT College Examination Code of Conduct.
            </span>
          </label>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartExam}
          disabled={!agreed || isYearMismatch}
          className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-bold rounded-xl transition shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 text-sm disabled:cursor-not-allowed"
        >
          <span>{isYearMismatch ? 'Assessment Restricted by Academic Year' : 'Enter Fullscreen & Begin Assessment'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
