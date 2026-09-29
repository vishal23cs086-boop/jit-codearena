'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useExamGuard } from '@/hooks/useExamGuard';
import { ExamGuardModal } from '@/components/exam/ExamGuard';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Send,
  RotateCcw,
  Shield,
  Loader2,
  FileCheck,
  Check,
  Maximize2,
  HelpCircle,
} from 'lucide-react';

export interface McqQuestionItem {
  id: string;
  question_number?: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  marks?: number;
  year?: number;
}

export interface McqAssessmentViewProps {
  test: {
    id: string;
    title: string;
    description?: string;
    duration?: number;
    duration_minutes?: number;
    total_marks?: number;
    passing_marks?: number;
    year?: number;
  };
  attemptId: string;
  endsAt: string;
  questions: McqQuestionItem[];
  initialAnswers?: Record<string, { selected_option?: string; updated_at?: string } | string>;
}

export const McqAssessmentView: React.FC<McqAssessmentViewProps> = ({
  test,
  attemptId,
  endsAt,
  questions,
  initialAnswers = {},
}) => {
  const router = useRouter();
  const { user, sendPresenceHeartbeat } = useAuth();

  const [currentIndex, setCurrentIndex] = useState(0);
  // Answers map: { [questionId]: 'A' | 'B' | 'C' | 'D' | null }
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    if (initialAnswers && typeof initialAnswers === 'object') {
      Object.entries(initialAnswers).forEach(([qId, val]) => {
        if (typeof val === 'string') {
          map[qId] = val.toUpperCase().trim();
        } else if (val && typeof val === 'object' && val.selected_option) {
          map[qId] = String(val.selected_option).toUpperCase().trim();
        }
      });
    }
    return map;
  });

  // Autosave status
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<number>(Date.now());
  const [lastSavedText, setLastSavedText] = useState<string>('● Saved just now');

  // Submit Modal & State
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Time remaining in seconds
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    if (!endsAt) return (test.duration_minutes || test.duration || 60) * 60;
    const diff = Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  const isTimerExpired = remainingSeconds <= 0;

  // Anti-cheating guard integration
  const examGuard = useExamGuard({
    enabled: true,
    studentId: user?.id || 'candidate',
    attemptId,
  });

  // Timer countdown hook
  useEffect(() => {
    const timer = setInterval(() => {
      if (!endsAt) {
        setRemainingSeconds((prev) => Math.max(0, prev - 1));
        return;
      }
      const diff = Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000);
      if (diff <= 0) {
        setRemainingSeconds(0);
        clearInterval(timer);
      } else {
        setRemainingSeconds(diff);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endsAt]);

  // Relative autosave time label updater
  useEffect(() => {
    const timer = setInterval(() => {
      if (saveStatus === 'saving') {
        setLastSavedText('Saving...');
        return;
      }
      if (saveStatus === 'error') {
        setLastSavedText('⚠ Error saving answer');
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

  // Presence heartbeat with current question index
  useEffect(() => {
    sendPresenceHeartbeat({
      active_assessment_id: test.id,
      current_question_index: currentIndex + 1,
      total_questions: questions.length,
      violation_count: examGuard.warningCount,
    });
  }, [currentIndex, examGuard.warningCount, questions.length, sendPresenceHeartbeat, test.id]);

  // Server-side answer persistence
  const saveAnswerToServer = useCallback(
    async (questionId: string, option: string | null) => {
      setSaveStatus('saving');
      try {
        const res = await fetch(`/api/student/mcq/${test.id}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attemptId,
            questionId,
            selectedOption: option,
          }),
        });

        if (res.ok) {
          setSaveStatus('saved');
          setLastSavedTimestamp(Date.now());
        } else {
          setSaveStatus('error');
        }
      } catch (err) {
        console.error('Failed to autosave MCQ answer:', err);
        setSaveStatus('error');
      }
    },
    [attemptId, test.id]
  );

  // Handle Option Select
  const handleSelectOption = (optionLetter: string) => {
    if (isSubmitting || isTimerExpired) return;
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    const normalized = optionLetter.toUpperCase().trim();
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: normalized,
    }));

    saveAnswerToServer(currentQuestion.id, normalized);
  };

  // Handle Clear Selection
  const handleClearSelection = () => {
    if (isSubmitting || isTimerExpired) return;
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[currentQuestion.id];
      return copy;
    });

    saveAnswerToServer(currentQuestion.id, null);
  };

  // Submit assessment to server
  const handleSubmitAssessment = useCallback(
    async (isAuto = false) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const res = await fetch(`/api/student/mcq/${test.id}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attemptId,
            isAutoSubmit: isAuto,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          router.replace(`/student/test/${test.id}/result`);
        } else {
          setSubmitError(data.error || 'Submission failed. Please check your network and retry.');
          setIsSubmitting(false);
        }
      } catch (err) {
        console.error('Error submitting MCQ assessment:', err);
        setSubmitError('Network failure during submission. Please try again.');
        setIsSubmitting(false);
      }
    },
    [attemptId, isSubmitting, router, test.id]
  );

  // Auto-submit when timer reaches 0
  const autoSubmitTriggered = useRef(false);
  useEffect(() => {
    if (remainingSeconds <= 0 && !autoSubmitTriggered.current) {
      autoSubmitTriggered.current = true;
      handleSubmitAssessment(true);
    }
  }, [remainingSeconds, handleSubmitAssessment]);

  const currentQuestion = questions[currentIndex] || null;
  const currentSelectedOption = currentQuestion ? answers[currentQuestion.id] : undefined;

  const answeredCount = Object.keys(answers).filter((k) => Boolean(answers[k])).length;
  const totalCount = questions.length;
  const unansweredCount = totalCount - answeredCount;

  // Format time remaining MM:SS
  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isLowTime = remainingSeconds < 300; // < 5 mins

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 select-none overflow-hidden">
      {/* Exam Guard Proctoring Modal */}
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

      {/* Top Header Bar */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shadow-xs shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 p-1 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center shrink-0">
            <img src="/jit-logo.png" alt="JIT Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 truncate max-w-[200px] sm:max-w-md">
                {test.title}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                MCQ • Year {test.year || 2}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
              <span>{user?.full_name || 'Candidate'}</span>
              <span>•</span>
              <span className="font-mono text-indigo-600 font-semibold">{user?.register_number}</span>
            </div>
          </div>
        </div>

        {/* Center / Right: Autosave status & Timer countdown */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-xs font-mono">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                saveStatus === 'saving'
                  ? 'bg-amber-500 animate-pulse'
                  : saveStatus === 'error'
                  ? 'bg-rose-500'
                  : 'bg-emerald-500'
              }`}
            />
            <span className="text-slate-500 text-[11px]">{lastSavedText}</span>
          </div>

          {/* Synchronized Timer Badge */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono font-bold text-xs shadow-xs transition-colors ${
              isLowTime
                ? 'bg-rose-50 border-rose-200 text-rose-700 animate-pulse'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${isLowTime ? 'text-rose-600' : 'text-indigo-600'}`} />
            <span>{formatTimer(remainingSeconds)}</span>
          </div>

          {/* Submit Button */}
          <button
            onClick={() => setShowSubmitModal(true)}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition hover:scale-[1.02] disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Finish & Submit</span>
            <span className="sm:hidden">Submit</span>
          </button>
        </div>
      </header>

      {/* Main Examination Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left / Center Area: Current Question Card */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
          <div className="max-w-4xl mx-auto w-full space-y-6">
            {/* Question Card */}
            {currentQuestion ? (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                {/* Question Metadata Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs">
                      Question {currentIndex + 1} of {totalCount}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      +{currentQuestion.marks || 2} Marks
                    </span>
                  </div>

                  {currentSelectedOption ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Check className="w-3.5 h-3.5" />
                      <span>Option {currentSelectedOption} Selected</span>
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-400">Not yet answered</span>
                  )}
                </div>

                {/* Question Statement */}
                <div className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed whitespace-pre-wrap">
                  {currentQuestion.question_text}
                </div>

                {/* Options (A, B, C, D) */}
                <div className="space-y-3 pt-2">
                  {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                    const optKey = `option_${letter.toLowerCase()}` as keyof McqQuestionItem;
                    const optionText = currentQuestion[optKey] as string;
                    if (!optionText) return null;

                    const isSelected = currentSelectedOption === letter;

                    return (
                      <button
                        key={letter}
                        type="button"
                        onClick={() => handleSelectOption(letter)}
                        disabled={isSubmitting || isTimerExpired}
                        className={`w-full text-left p-4 sm:p-5 rounded-2xl border-2 transition-all flex items-start gap-4 ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-500/20'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 bg-white'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {letter}
                        </div>
                        <div
                          className={`text-sm sm:text-base leading-relaxed pt-0.5 ${
                            isSelected ? 'text-indigo-950 font-semibold' : 'text-slate-700'
                          }`}
                        >
                          {optionText}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400">
                No question available.
              </div>
            )}
          </div>

          {/* Bottom Action Controls */}
          <div className="max-w-4xl mx-auto w-full pt-6 pb-2 flex items-center justify-between gap-4">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0 || isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {currentSelectedOption && (
              <button
                onClick={handleClearSelection}
                disabled={isSubmitting || isTimerExpired}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Selection</span>
              </button>
            )}

            {currentIndex < totalCount - 1 ? (
              <button
                onClick={() => setCurrentIndex((prev) => Math.min(totalCount - 1, prev + 1))}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition hover:scale-[1.02]"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setShowSubmitModal(true)}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition hover:scale-[1.02]"
              >
                <span>Review & Submit</span>
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </main>

        {/* Right Sidebar: 30-Question Palette */}
        <aside className="w-72 lg:w-80 bg-white border-l border-slate-200 p-5 flex flex-col justify-between overflow-y-auto shrink-0 shadow-xs hidden sm:flex">
          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Question Palette
              </h3>
              <p className="text-[11px] text-slate-500">
                Click any question number to jump directly.
              </p>
            </div>

            {/* Answer Status Counter */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <span className="text-emerald-700 font-bold">Answered:</span>
                <span className="text-emerald-800 font-black">{answeredCount}</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <span className="text-slate-600 font-bold">Pending:</span>
                <span className="text-slate-800 font-black">{unansweredCount}</span>
              </div>
            </div>

            {/* Question Buttons Matrix */}
            <div className="grid grid-cols-5 gap-2 pt-2">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = Boolean(answers[q.id]);

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-10 rounded-xl font-mono text-xs font-bold transition-all relative flex items-center justify-center ${
                      isCurrent
                        ? 'ring-2 ring-indigo-600 ring-offset-2 font-black z-10'
                        : ''
                    } ${
                      isAnswered
                        ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-slate-100 space-y-2 text-[11px] text-slate-600 font-medium">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-emerald-600 shrink-0" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-300 shrink-0" />
                <span>Unanswered ({unansweredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded border-2 border-indigo-600 shrink-0" />
                <span>Current Question</span>
              </div>
            </div>
          </div>

          {/* Quick Submit inside Sidebar */}
          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={() => setShowSubmitModal(true)}
              disabled={isSubmitting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition hover:scale-[1.01] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <FileCheck className="w-4 h-4" />
              <span>Submit Assessment</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Confirmation Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Exam Submission</h3>
                <p className="text-xs text-slate-500">You are about to submit your official assessment.</p>
              </div>
            </div>

            {/* Assessment Summary Stats */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Total Questions:</span>
                <span className="font-bold text-slate-900">{totalCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Answered:</span>
                <span className="font-bold text-emerald-600">{answeredCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Unanswered / Pending:</span>
                <span className="font-bold text-rose-600">{unansweredCount}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-mono">
                <span className="text-slate-600 font-sans">Time Remaining:</span>
                <span className="font-bold text-indigo-600">{formatTimer(remainingSeconds)}</span>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
                <strong>Attention:</strong> You still have <strong>{unansweredCount}</strong> unanswered questions. Unanswered questions will receive 0 marks.
              </div>
            )}

            {submitError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {submitError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Back to Questions
              </button>
              <button
                type="button"
                onClick={() => handleSubmitAssessment(false)}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Evaluating...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Yes, Submit Exam</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
