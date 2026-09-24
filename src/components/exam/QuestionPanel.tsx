'use client';

import React, { useState } from 'react';
import { Question } from '@/types';
import { BookOpen, History, Award, Clock, Cpu, CheckCircle2, XCircle } from 'lucide-react';

interface QuestionPanelProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  solved?: boolean;
}

export const QuestionPanel: React.FC<QuestionPanelProps> = ({
  question,
  questionNumber,
  totalQuestions,
  solved = false,
}) => {
  const [activeTab, setActiveTab] = useState<'description' | 'submissions'>('description');

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Easy':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'Medium':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'Hard':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      default:
        return 'text-blue-700 bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
      {/* Navigation tabs */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/90 border-b border-slate-200/90 text-xs backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('description')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'description'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            <span>Problem Description</span>
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'submissions'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5 text-indigo-600" />
            <span>Submissions</span>
          </button>
        </div>

        <span className="text-xs text-slate-500 font-mono">
          Question {questionNumber} of {totalQuestions}
        </span>
      </div>

      {/* Main content body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 text-slate-700">
        {activeTab === 'description' ? (
          <>
            {/* Title & Badges Header */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span>{questionNumber}. {question.title}</span>
                  {solved && (
                    <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Solved
                    </span>
                  )}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`px-2.5 py-0.5 rounded-full font-medium border ${getDifficultyColor(question.difficulty)}`}>
                  {question.difficulty}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Topic: {question.topic}
                </span>
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                  <Award className="w-3 h-3 text-indigo-600" />
                  {question.marks} Marks
                </span>
                <span className="flex items-center gap-1 text-slate-500 px-2 py-0.5 font-mono">
                  <Clock className="w-3 h-3" /> {question.time_limit_ms / 1000}s limit
                </span>
                <span className="flex items-center gap-1 text-slate-500 px-2 py-0.5 font-mono">
                  <Cpu className="w-3 h-3" /> {Math.round(question.memory_limit_kb / 1024)}MB
                </span>
              </div>
            </div>

            {/* Description Text */}
            <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-line border-t border-slate-100 pt-4">
              {question.description}
            </div>

            {/* Input & Output Specifications */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Input Format
                </h4>
                <p className="text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed">
                  {question.input_format}
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Output Format
                </h4>
                <p className="text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed">
                  {question.output_format}
                </p>
              </div>
            </div>

            {/* Constraints */}
            <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200/80">
              <h4 className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-2">
                Constraints
              </h4>
              <ul className="text-xs font-mono text-amber-900 space-y-1 list-disc list-inside">
                {question.constraints.split('\n').map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>

            {/* Sample Examples (Public Test Cases) */}
            {question.test_cases && question.test_cases.filter((tc) => !tc.is_hidden).length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Sample Examples
                </h4>
                {question.test_cases
                  .filter((tc) => !tc.is_hidden)
                  .map((tc, idx) => (
                    <div
                      key={tc.id || idx}
                      className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs font-mono space-y-2.5"
                    >
                      <div className="text-slate-900 font-sans font-semibold">Example {idx + 1}</div>
                      <div>
                        <span className="text-slate-500 font-sans block mb-1">Input:</span>
                        <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-slate-800 whitespace-pre-wrap">
                          {tc.input}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans block mb-1">Expected Output:</span>
                        <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-emerald-700 font-semibold whitespace-pre-wrap">
                          {tc.expected_output}
                        </div>
                      </div>
                      {tc.explanation && (
                        <div className="font-sans text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
                          Explanation: {tc.explanation}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {/* Sample Explanation if provided */}
            {question.sample_explanation && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 text-xs">
                <h4 className="font-semibold text-indigo-900 mb-1">Problem Insight:</h4>
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {question.sample_explanation}
                </p>
              </div>
            )}
          </>
        ) : (
          /* Submissions History Tab */
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Your Submissions for this Question</h3>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500 space-y-2">
              <p>Submissions will appear here after clicking "Submit Code".</p>
              <p className="text-[11px] text-slate-400">
                Scores and test case counts are validated server-side.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
