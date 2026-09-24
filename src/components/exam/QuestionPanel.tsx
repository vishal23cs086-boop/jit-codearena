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
        return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
      case 'Medium':
        return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
      case 'Hard':
        return 'text-rose-400 bg-rose-500/15 border-rose-500/30';
      default:
        return 'text-blue-400 bg-blue-500/15 border-blue-500/30';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0B1020] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
      {/* Navigation tabs */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-white/10 text-xs backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('description')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'description'
                ? 'bg-white/10 text-white shadow-xs border border-white/15'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>Problem Description</span>
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'submissions'
                ? 'bg-white/10 text-white shadow-xs border border-white/15'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span>Submissions</span>
          </button>
        </div>

        <span className="text-xs text-slate-400 font-mono">
          Question {questionNumber} of {totalQuestions}
        </span>
      </div>

      {/* Main content body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 text-slate-300">
        {activeTab === 'description' ? (
          <>
            {/* Title & Badges Header */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>{questionNumber}. {question.title}</span>
                  {solved && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Solved
                    </span>
                  )}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`px-2.5 py-0.5 rounded-full font-medium border ${getDifficultyColor(question.difficulty)}`}>
                  {question.difficulty}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/[0.04] text-slate-300 border border-white/10">
                  Topic: {question.topic}
                </span>
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-medium">
                  <Award className="w-3 h-3 text-indigo-400" />
                  {question.marks} Marks
                </span>
                <span className="flex items-center gap-1 text-slate-400 px-2 py-0.5">
                  <Clock className="w-3 h-3" /> {question.time_limit_ms / 1000}s limit
                </span>
                <span className="flex items-center gap-1 text-slate-400 px-2 py-0.5">
                  <Cpu className="w-3 h-3" /> {Math.round(question.memory_limit_kb / 1024)}MB
                </span>
              </div>
            </div>

            {/* Description Text */}
            <div className="text-sm leading-relaxed text-slate-300 whitespace-pre-line border-t border-white/[0.08] pt-4">
              {question.description}
            </div>

            {/* Input & Output Specifications */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/[0.03] p-3.5 rounded-xl border border-white/[0.08]">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Input Format
                </h4>
                <p className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                  {question.input_format}
                </p>
              </div>

              <div className="bg-white/[0.03] p-3.5 rounded-xl border border-white/[0.08]">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Output Format
                </h4>
                <p className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                  {question.output_format}
                </p>
              </div>
            </div>

            {/* Constraints */}
            <div className="bg-amber-500/10 p-3.5 rounded-xl border border-amber-500/20">
              <h4 className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2">
                Constraints
              </h4>
              <ul className="text-xs font-mono text-amber-200 space-y-1 list-disc list-inside">
                {question.constraints.split('\n').map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>

            {/* Sample Examples (Public Test Cases) */}
            {question.test_cases && question.test_cases.filter((tc) => !tc.is_hidden).length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Sample Examples
                </h4>
                {question.test_cases
                  .filter((tc) => !tc.is_hidden)
                  .map((tc, idx) => (
                    <div
                      key={tc.id || idx}
                      className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3.5 text-xs font-mono space-y-2.5"
                    >
                      <div className="text-white font-sans font-semibold">Example {idx + 1}</div>
                      <div>
                        <span className="text-slate-400 font-sans block mb-1">Input:</span>
                        <div className="bg-black/40 border border-white/10 p-2.5 rounded-lg text-slate-200 whitespace-pre-wrap">
                          {tc.input}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 font-sans block mb-1">Expected Output:</span>
                        <div className="bg-black/40 border border-white/10 p-2.5 rounded-lg text-emerald-400 font-semibold whitespace-pre-wrap">
                          {tc.expected_output}
                        </div>
                      </div>
                      {tc.explanation && (
                        <div className="font-sans text-slate-400 text-[11px] pt-1 border-t border-white/[0.06]">
                          Explanation: {tc.explanation}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {/* Sample Explanation if provided */}
            {question.sample_explanation && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3.5 text-xs">
                <h4 className="font-semibold text-indigo-300 mb-1">Problem Insight:</h4>
                <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {question.sample_explanation}
                </p>
              </div>
            )}
          </>
        ) : (
          /* Submissions History Tab */
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Your Submissions for this Question</h3>
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 text-center text-xs text-slate-400 space-y-2">
              <p>Submissions will appear here after clicking "Submit Code".</p>
              <p className="text-[11px] text-slate-500">
                Scores and test case counts are validated server-side.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
