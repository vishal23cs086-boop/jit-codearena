'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { fetchTests, fetchQuestions, saveAttempt, recordActivityLog } from '@/lib/db';
import { Test, Question, TestCaseResult, TestAttempt } from '@/types';
import { useExamGuard } from '@/hooks/useExamGuard';
import { ExamGuardModal } from '@/components/exam/ExamGuard';
import { QuestionPanel } from '@/components/exam/QuestionPanel';
import { PythonMonacoEditor } from '@/components/editor/PythonMonacoEditor';
import { ConsolePanel } from '@/components/exam/ConsolePanel';
import { TimerBadge } from '@/components/exam/TimerBadge';
import { EmptyState } from '@/components/ui/EmptyState';
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
  Loader2,
  FileCode,
} from 'lucide-react';

export default function CodingTestPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const testId = typeof params?.id === 'string' ? params.id : '';

  const [loading, setLoading] = useState<boolean>(true);
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);

  // Map of student's current code per questionId
  const [studentCodeMap, setStudentCodeMap] = useState<Record<string, string>>({});

  // Track status of questions: solved, attempted, unattempted
  const [questionScores, setQuestionScores] = useState<Record<string, number>>({});
  const [solvedQuestions, setSolvedQuestions] = useState<Record<string, boolean>>({});

  // Auto-save state
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<number>(Date.now());
  const [lastSavedText, setLastSavedText] = useState<string>('● Saved just now');

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

  // Load Test and its Questions from Database
  useEffect(() => {
    async function loadAssessmentData() {
      setLoading(true);
      try {
        const tests = await fetchTests();
        const foundTest = tests.find((t) => t.id === testId) || tests[0] || null;
        setTest(foundTest);

        let activeQuestions: Question[] = [];
        if (foundTest?.questions && foundTest.questions.length > 0) {
          activeQuestions = foundTest.questions.map((tq) => tq.question!).filter(Boolean);
        }

        if (activeQuestions.length === 0) {
          const allDbQuestions = await fetchQuestions();
          activeQuestions = allDbQuestions.filter((q) => q.is_active);
        }

        setQuestions(activeQuestions);

        // Initialize code map with starter codes
        const initialMap: Record<string, string> = {};
        activeQuestions.forEach((q) => {
          initialMap[q.id] = q.starter_code || 'def solution():\n    pass\n';
        });
        setStudentCodeMap(initialMap);
      } catch (err) {
        console.error('Failed to load assessment data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAssessmentData();
  }, [testId]);

  const currentQuestion = questions[currentQIndex] || null;

  // Anti-cheating guard integration
  const examGuard = useExamGuard({
    enabled: Boolean(test && questions.length > 0),
    studentId: user?.id || 'candidate',
    attemptId: `att-${testId}`,
  });

  // Relative autosave time label updater
  useEffect(() => {
    const timer = setInterval(() => {
      if (saveStatus === 'saving') {
        setLastSavedText('Saving...');
        return;
      }
      const elapsedSeconds = Math.floor((Date.now() - lastSavedTimestamp) / 1000);
      if (elapsedSeconds <= 3) {
        setLastSavedText('● Saved just now');
      } else {
        setLastSavedText(`● Saved ${elapsedSeconds} seconds ago`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lastSavedTimestamp, saveStatus]);

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
        setLastSavedTimestamp(Date.now());
      } catch {
        setSaveStatus('saved');
      }
    },
    [testId, user?.id]
  );

  // Periodic Auto-save every 20 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentQuestion && studentCodeMap[currentQuestion.id]) {
        saveCodeToServer(currentQuestion.id, studentCodeMap[currentQuestion.id]);
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [currentQuestion, studentCodeMap, saveCodeToServer]);

  // Code editor change
  const handleCodeChange = (newCode: string) => {
    if (!currentQuestion) return;
    setStudentCodeMap((prev) => ({
      ...prev,
      [currentQuestion.id]: newCode,
    }));
    setSaveStatus('unsaved');
  };

  // Change question handler
  const handleSelectQuestion = (index: number) => {
    if (currentQuestion && studentCodeMap[currentQuestion.id]) {
      saveCodeToServer(currentQuestion.id, studentCodeMap[currentQuestion.id]);
    }
    setCurrentQIndex(index);
    setLastRunResult(null);
  };

  // Run Code (runs on sample test cases or custom input)
  const handleRunCode = async (customInput?: string) => {
    if (!currentQuestion) return;
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

  // Submit Code (evaluates against test cases on server and assigns score)
  const handleSubmitCode = async () => {
    if (!currentQuestion) return;
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
          testCases: currentQuestion.test_cases || [],
          timeLimitMs: currentQuestion.time_limit_ms,
          marks: currentQuestion.marks,
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
    const completedAt = new Date().toISOString();
    let totalScore = 0;
    Object.values(questionScores).forEach((val) => {
      if (typeof val === 'number') totalScore += val;
    });

    const maxMarks = test?.total_marks || 100;
    const percentage = Math.round((totalScore / maxMarks) * 100);

    const attemptRecord: TestAttempt = {
      id: `att-${testId}-${user?.register_number || 'guest'}`,
      test_id: testId,
      student_id: user?.id || 'candidate',
      started_at: new Date(Date.now() - 1800000).toISOString(),
      last_saved_at: completedAt,
      completed_at: completedAt,
      status: isAutoSubmit ? 'auto_submitted' : 'submitted',
      score: totalScore,
      percentage,
      time_taken_seconds: 1800,
      tab_switch_count: examGuard.tabSwitchCount,
      fullscreen_exit_count: examGuard.fullscreenExitCount,
      copy_paste_count: examGuard.copyPasteCount,
      completion_rank: 1,
      auto_submitted: isAutoSubmit,
      students: user ? {
        register_number: user.register_number,
        department: user.department,
        year: user.year,
        profiles: {
          full_name: user.full_name,
          email: user.email,
        },
      } : undefined,
      tests: test ? {
        title: test.title,
      } : undefined,
    };

    try {
      await saveAttempt(attemptRecord);
      await fetch('/api/exam/submit-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: attemptRecord.id,
          studentId: user?.id || 'candidate',
          testId,
          isAutoSubmit,
          finalScores: questionScores,
        }),
      });
    } catch (err) {
      console.warn('Finalize test warning:', err);
    }

    router.push(`/student/test/${testId}/result`);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#F7F9FC] flex flex-col items-center justify-center text-slate-900 space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Loading Assessment Environment...</p>
      </div>
    );
  }

  if (questions.length === 0 || !currentQuestion) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <EmptyState
          icon={FileCode}
          title="No questions available for this assessment"
          description="The examination coordinator has not linked any questions to this assessment yet. Please contact the invigilator."
          actionText="Return to Assessments"
          actionHref="/student/assessments"
        />
      </div>
    );
  }

  const solvedCount = Object.values(solvedQuestions).filter(Boolean).length;
  const progressPercent = Math.round((solvedCount / questions.length) * 100);

  return (
    <div className="fixed inset-0 bg-[#F7F9FC] flex flex-col z-30 select-none overflow-hidden font-sans">
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
      <header className="h-14 bg-white/95 border-b border-slate-200/90 px-4 flex items-center justify-between flex-shrink-0 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center p-1 shrink-0 shadow-xs">
              <img
                src="/jit-logo.png"
                alt="Jansons Institute of Technology Crest"
                className="w-full h-full object-contain filter drop-shadow-sm"
              />
            </div>
            <div>
              <span className="font-black text-sm text-slate-900">{test?.title || 'JIT Assessment'}</span>
              <p className="text-[10px] text-slate-500 font-mono">
                {user?.register_number} • {user?.full_name}
              </p>
            </div>
          </div>

          {/* Question Selector Bubbles */}
          <div className="hidden md:flex items-center gap-1.5 pl-4 border-l border-slate-200">
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
                      ? 'ring-2 ring-indigo-500 bg-indigo-600 text-white shadow-xs'
                      : isSolved
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : isAttempted
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
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
          <span className="text-xs text-slate-500">Progress: {solvedCount}/{questions.length} Solved</span>
          <div className="w-32 bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Right side: Countdown Timer & End Test */}
        <div className="flex items-center gap-3">
          <TimerBadge
            initialSeconds={(test?.duration_minutes || 60) * 60}
            onTimeExpire={() => handleFinalizeTest(true)}
          />

          <button
            onClick={() => setShowExitConfirm(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Finish Test</span>
          </button>
        </div>
      </header>

      {/* MAIN TWO-PANE WORKSPACE */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 p-2 overflow-hidden bg-[#F7F9FC]">
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
              lastSavedText={lastSavedText}
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

      {/* FOOTER BAR: Next / Prev Question Navigator & Autosave */}
      <footer className="h-10 bg-white/95 border-t border-slate-200/90 px-4 flex items-center justify-between text-xs flex-shrink-0 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSelectQuestion(Math.max(0, currentQIndex - 1))}
            disabled={currentQIndex === 0}
            className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 disabled:opacity-30 text-slate-700 rounded-lg border border-slate-200 transition text-xs shadow-xs"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous Problem</span>
          </button>

          <button
            onClick={() => handleSelectQuestion(Math.min(questions.length - 1, currentQIndex + 1))}
            disabled={currentQIndex === questions.length - 1}
            className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 disabled:opacity-30 text-slate-700 rounded-lg border border-slate-200 transition text-xs shadow-xs"
          >
            <span>Next Problem</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px]">
          <span className="text-emerald-700 font-medium">{lastSavedText}</span>
          <span>•</span>
          <span>Security Audit Active</span>
        </div>
      </footer>

      {/* Confirmation modal before final submit */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl max-w-md w-full p-7 space-y-4 shadow-2xl border border-slate-200/90 bg-white">
            <h3 className="text-lg font-bold text-slate-900">Finalize & Submit Assessment?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to submit? You have answered <strong>{solvedCount} of {questions.length}</strong> questions.
              Once submitted, your answers will be locked, your server completion timestamp will be recorded, and you cannot re-attempt.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium transition border border-slate-200 shadow-xs"
              >
                Return to Test
              </button>
              <button
                onClick={() => handleFinalizeTest(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-indigo-600/20"
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
