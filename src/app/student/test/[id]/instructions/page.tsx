'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { MOCK_TESTS } from '@/lib/mockData';
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
} from 'lucide-react';

export default function TestInstructionsPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [agreed, setAgreed] = useState(false);

  const testId = typeof params?.id === 'string' ? params.id : 'test-jit-py-2026';
  const test = MOCK_TESTS.find((t) => t.id === testId) || MOCK_TESTS[0];

  const handleStartExam = async () => {
    if (!agreed) return;

    // Request fullscreen on start
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      }
    } catch {
      // Proceed even if browser blocks immediate call
    }

    router.push(`/student/test/${testId}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 w-full space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
          <FileCode className="w-3.5 h-3.5" />
          <span>OFFICIAL EXAMINATION INSTRUCTIONS</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{test.title}</h1>
        <p className="text-sm text-slate-300 leading-relaxed">{test.description}</p>

        {/* Candidate Badge */}
        <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Candidate Name:</span>
            <span className="text-white font-bold text-sm">{user?.full_name || 'Candidate'}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Register Number:</span>
            <span className="text-indigo-400 font-mono font-bold text-sm">
              {user?.register_number || '22CS084'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Department & Year:</span>
            <span className="text-white font-medium">
              {user?.department || 'CSE'} • Year {user?.year || 3}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Total Marks:</span>
            <span className="text-emerald-400 font-bold text-sm">{test.total_marks} Marks</span>
          </div>
        </div>
      </div>

      {/* Rules & Guidelines */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <span>Assessment Rules & Anti-Cheating Guidelines</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1.5">
            <div className="font-semibold text-white flex items-center gap-2">
              <Maximize2 className="w-4 h-4 text-indigo-400" />
              <span>1. Mandatory Fullscreen Mode</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              The assessment must be taken in full-screen mode. Exiting fullscreen at any point triggers a security warning and increments your event log count.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1.5">
            <div className="font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>2. Tab Switching Prohibited</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Do not switch tabs, minimize your window, or open other applications. Every tab transition is recorded with timestamp to the invigilator dashboard.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1.5">
            <div className="font-semibold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-400" />
              <span>3. Clipboard Restrictions</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Copying, cutting, and pasting code are strictly blocked. Code must be authored in the Monaco editor.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1.5">
            <div className="font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>4. Server-Controlled Timer & Auto-Submit</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Your test duration is 60 minutes. Your progress is auto-saved periodically. If time elapses, your code will be automatically submitted.
            </p>
          </div>
        </div>

        {/* Warning disclaimer required by specs */}
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 leading-relaxed">
          <strong>Notice:</strong> Browser deterrents and logs are active to preserve assessment integrity. Candidates involved in unauthorized practices will be reported directly to the Examination Disciplinary Cell.
        </div>

        {/* Honor Code Checkbox */}
        <div className="pt-2 border-t border-slate-800">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
            />
            <span className="text-xs text-slate-300 group-hover:text-white leading-relaxed">
              I acknowledge that I am attempting this test independently without using external AI, web search, or unauthorized materials. I agree to abide by the JIT College Examination Code of Conduct.
            </span>
          </label>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartExam}
          disabled={!agreed}
          className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-sm"
        >
          <span>Enter Fullscreen & Begin Assessment</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
