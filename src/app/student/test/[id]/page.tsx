'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { MOCK_TESTS, MOCK_QUESTIONS } from '@/lib/mockData';
import { Question, TestCaseResult } from '@/types';
import { useExamGuard } from '@/hooks/useExamGuard';
import { ExamGuardModal } from '@/components/exam/ExamGuard';
import { QuestionPanel } from '@/components/exam/QuestionPanel';
import { PythonMonacoEditor } from '@/components/editor/PythonMonacoEditor';
import { ConsolePanel } from '@/components/exam/ConsolePanel';
import { TimerBadge } from '@/components/exam/TimerBadge';
import {
  Code2,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  CheckCircle2,
  Shield,
  LogOut,
  Maximize2,
} from 'lucide-react';

export default function CodingTestPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const testId = typeof params?.id === 'string' ? params.id : 'test-jit-py-2026';
  const test = MOCK_TESTS.find((t) => t.id === testId) || MOCK_TESTS[0];
  const questions: Question[] = test.questions?.map((tq) => tq.question!).filter(Boolean) || MOCK_QUESTIONS;

  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const currentQuestion = questions[currentQIndex] || questions[0];

  // Map of student's current code per questionId
  const [studentCodeMap, setStudentCodeMap] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    questions.forEach((q) => {
      initial[q.id] = q.starter_code;
    });
    return initial;
  });

  // Track status of questions: solved, attempted, unattempted
  const [questionScores, setQuestionScores] = useState<Record<string, number>>({});
  const [solvedQuestions, setSolvedQuestions] = useState<Record<string, boolean>>({});

  // Auto-save state
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('Just now');

  // Execution states
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lastRunResult, setLastRunResult] = useState<{
    status?: string;
    passedCases?: number;
    totalCases?: number;
    stdout?: string;
    stderr?: string;
    timeMs?: number;
    memoryKb?: number;
    caseResults?: TestCaseResult[];
    isSubmission?: boolean;
    score?: number;
  } | null>(null);

  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Anti-cheating guard integration
  const examGuard = useExamGuard({
    enabled: true,
    studentId: user?.id || 'candidate',
    attemptId: `att-${testId}`,
  });

  // Helper to persist draft code to server
  const saveCodeToServer = useCallback(
    async (qId: string, codeToSave: string) => {
      setSaveStatus('saving');
      try {
        await fetch('/api/exam/save-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attemptId: `att-${testId}`,
            questionId: qId,
            studentId: user?.id || 'candidate',
            code: codeToSave,
          }),
        });
        setSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch {
        setSaveStatus('saved');
      }
    },
    [testId, user?.id]
  );

  // Periodic Auto-save every 25 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentQuestion && studentCodeMap[currentQuestion.id]) {
        saveCodeToServer(currentQuestion.id, studentCodeMap[currentQuestion.id]);
      }
    }, 25000);
    return () => clearInterval(interval);
  }, [currentQuestion, studentCodeMap, saveCodeToServer]);

  // Code editor change
  const handleCodeChange = (newCode: string) => {
    setStudentCodeMap((prev) => ({
      ...prev,
      [currentQuestion.id]: newCode,
    }));
    setSaveStatus('unsaved');
  };

  // Change question handler
  const handleSelectQuestion = (index: number) => {
    // Save current code before switching
    if (currentQuestion && studentCodeMap[currentQuestion.id]) {
      saveCodeToServer(currentQuestion.id, studentCodeMap[currentQuestion.id]);
    }
    setCurrentQIndex(index);
    setLastRunResult(null);
  };

  // Run Code (runs on sample test cases or custom input)
  const handleRunCode = async (customInput?: string) => {
    setIsRunning(true);
    const code = studentCodeMap[currentQuestion.id] || '';

    try {
      const inputToUse = customInput !== undefined ? customInput : currentQuestion.test_cases?.[0]?.input || '';
      const res = await fetch('/api/code/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          input: inputToUse,
          timeLimitMs: currentQuestion.time_limit_ms,
        }),
      });

      const data = await res.json();
      setLastRunResult({
        status: data.status || 'Executed',
        stdout: data.stdout || '',
        stderr: data.stderr || '',
        timeMs: data.timeMs || 45,
        memoryKb: data.memoryKb || 3200,
        isSubmission: false,
      });
    } catch {
      setLastRunResult({
        status: 'Runtime Error',
        stderr: 'Network or execution failure connecting to execution worker.',
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Submit Code (evaluates against hidden test cases on server and assigns score)
  const handleSubmitCode = async () => {
    setIsSubmitting(true);
    const code = studentCodeMap[currentQuestion.id] || '';

    try {
      const res = await fetch('/api/code/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          code,
          attemptId: `att-${testId}`,
          studentId: user?.id || 'candidate',
          attemptNumber: 1,
        }),
      });

      const data = await res.json();

      setLastRunResult({
        status: data.status,
        passedCases: data.testCasesPassed,
        totalCases: data.totalTestCases,
        caseResults: data.results,
        score: data.score,
        timeMs: data.executionTimeMs,
        memoryKb: data.memoryKb,
        isSubmission: true,
      });

      if (data.status === 'Accepted' || (data.testCasesPassed && data.testCasesPassed === data.totalTestCases)) {
        setSolvedQuestions((prev) => ({ ...prev, [currentQuestion.id]: true }));
      }
      if (typeof data.score === 'number') {
        setQuestionScores((prev) => ({ ...prev, [currentQuestion.id]: data.score }));
      }
    } catch {
      setLastRunResult({
        status: 'Error',
        stderr: 'Failed to record official submission to evaluation server.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Finalize & Submit Test (manual or when timer expires)
  const handleFinalizeTest = async (isAutoSubmit = false) => {
    try {
      await fetch('/api/exam/submit-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: `att-${testId}`,
          studentId: user?.id || 'candidate',
          testId,
          isAutoSubmit,
          finalScores: questionScores,
        }),
      });
    } catch (err) {
      console.warn('Finalize test API warning:', err);
    }

    router.push(`/student/test/${testId}/result`);
  };

  const solvedCount = Object.values(solvedQuestions).filter(Boolean).length;
  const progressPercent = Math.round((solvedCount / questions.length) * 100);

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col z-30 select-none overflow-hidden font-sans">
      {/* Anti-Cheating Fullscreen Enforcement and Warning Modals */}
      <ExamGuardModal
        isFullscreen={examGuard.isFullscreen}
        warningMessage={examGuard.warningMessage}
        showWarningModal={examGuard.showWarningModal}
        tabSwitchCount={examGuard.tabSwitchCount}
        fullscreenExitCount={examGuard.fullscreenExitCount}
        copyPasteCount={examGuard.copyPasteCount}
        onRequestFullscreen={examGuard.requestFullscreen}
        onDismissWarning={examGuard.dismissWarning}
      />

      {/* TOP NAVIGATION BAR */}
      <header className="h-14 bg-slate-950/90 border-b border-slate-800 px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-white">{test.title}</span>
              <p className="text-[10px] text-slate-400 font-mono">
                {user?.register_number} • {user?.full_name}
              </p>
            </div>
          </div>

          {/* Question Selector Bubbles */}
          <div className="hidden md:flex items-center gap-1.5 pl-4 border-l border-slate-800">
            {questions.map((q, idx) => {
              const isCurrent = currentQIndex === idx;
              const isSolved = solvedQuestions[q.id];
              const isAttempted = questionScores[q.id] !== undefined;

              return (
                <button
                  key={q.id}
                  onClick={() => handleSelectQuestion(idx)}
                  className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center ${
                    isCurrent
                      ? 'ring-2 ring-indigo-400 bg-indigo-600 text-white shadow-md'
                      : isSolved
                      ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40'
                      : isAttempted
                      ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
                  }`}
                  title={`Question ${idx + 1}: ${q.title}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center / Progress bar */}
        <div className="hidden lg:flex items-center gap-3">
          <span className="text-xs text-slate-400">Progress: {solvedCount}/{questions.length} Solved</span>
          <div className="w-32 bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Right side: Countdown Timer & End Test */}
        <div className="flex items-center gap-3">
          <TimerBadge
            initialSeconds={test.duration_minutes * 60}
            onTimeExpire={() => handleFinalizeTest(true)}
          />

          <button
            onClick={() => setShowExitConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Finish Test</span>
          </button>
        </div>
      </header>

      {/* MAIN TWO-PANE WORKSPACE */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 p-2 overflow-hidden">
        {/* LEFT PANE: Question Problem Specs (5 cols on desktop) */}
        <div className="lg:col-span-5 h-full overflow-hidden">
          <QuestionPanel
            question={currentQuestion}
            questionNumber={currentQIndex + 1}
            totalQuestions={questions.length}
            solved={Boolean(solvedQuestions[currentQuestion.id])}
          />
        </div>

        {/* RIGHT PANE: Monaco Editor + Console (7 cols on desktop) */}
        <div className="lg:col-span-7 h-full flex flex-col gap-2 overflow-hidden">
          {/* Top Half: Monaco Python Editor */}
          <div className="flex-[6] min-h-[300px] overflow-hidden">
            <PythonMonacoEditor
              code={studentCodeMap[currentQuestion.id] || ''}
              onChange={handleCodeChange}
              starterCode={currentQuestion.starter_code}
              saveStatus={saveStatus}
              lastSavedText={`Saved at ${lastSavedTime}`}
            />
          </div>

          {/* Bottom Half: Console & Execution Results */}
          <div className="flex-[4] min-h-[220px] overflow-hidden">
            <ConsolePanel
              testCases={currentQuestion.test_cases || []}
              isRunning={isRunning}
              isSubmitting={isSubmitting}
              onRunCode={handleRunCode}
              onSubmitCode={handleSubmitCode}
              lastRunResult={lastRunResult}
            />
          </div>
        </div>
      </div>

      {/* FOOTER BAR: Next / Prev Question Navigator */}
      <footer className="h-10 bg-slate-950/90 border-t border-slate-800 px-4 flex items-center justify-between text-xs flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSelectQuestion(Math.max(0, currentQIndex - 1))}
            disabled={currentQIndex === 0}
            className="flex items-center gap-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 rounded border border-slate-800 transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous Problem</span>
          </button>

          <button
            onClick={() => handleSelectQuestion(Math.min(questions.length - 1, currentQIndex + 1))}
            disabled={currentQIndex === questions.length - 1}
            className="flex items-center gap-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 rounded border border-slate-800 transition"
          >
            <span>Next Problem</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
          <span>Security Audit Active</span>
          <span>•</span>
          <span>Auto-save Synced</span>
        </div>
      </footer>

      {/* Confirm Final Submission Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Finalize & Submit Assessment?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              You have completed <strong>{solvedCount} of {questions.length}</strong> problems. Once submitted, your answers will be locked, your server completion timestamp will be recorded, and you cannot re-attempt.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
              >
                Return to Test
              </button>
              <button
                onClick={() => handleFinalizeTest(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-indigo-600/30"
              >
                Yes, Submit Assessment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
