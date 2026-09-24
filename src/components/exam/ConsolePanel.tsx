'use client';

import React, { useState } from 'react';
import { TestCase, TestCaseResult } from '@/types';
import { Play, Send, CheckCircle2, XCircle, AlertTriangle, Lock, Clock, Terminal, Sliders } from 'lucide-react';

interface ConsolePanelProps {
  testCases: TestCase[];
  isRunning: boolean;
  isSubmitting: boolean;
  onRunCode: (customInput?: string) => void;
  onSubmitCode: () => void;
  lastRunResult: {
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
  } | null;
}

export const ConsolePanel: React.FC<ConsolePanelProps> = ({
  testCases,
  isRunning,
  isSubmitting,
  onRunCode,
  onSubmitCode,
  lastRunResult,
}) => {
  const [activeTab, setActiveTab] = useState<'testcases' | 'result' | 'custom'>('testcases');
  const [selectedCaseIdx, setSelectedCaseIdx] = useState<number>(0);
  const [customInput, setCustomInput] = useState<string>('');

  const publicCases = testCases.filter((tc) => !tc.is_hidden);

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
      {/* Console Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/90 border-b border-slate-200/90 backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('testcases')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'testcases'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-600" />
            <span>Sample Test Cases</span>
          </button>

          <button
            onClick={() => setActiveTab('result')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'result'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>Execution Result</span>
            {lastRunResult && (
              <span
                className={`w-2 h-2 rounded-full ${
                  lastRunResult.status === 'Accepted' ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab('custom')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'custom'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            <span>Custom Input</span>
          </button>
        </div>

        {/* Action Buttons: Run Code & Submit Code */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setActiveTab('result');
              onRunCode(activeTab === 'custom' ? customInput : undefined);
            }}
            disabled={isRunning || isSubmitting}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition shadow-xs"
          >
            <Play className={`w-3.5 h-3.5 text-indigo-600 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Running...' : 'Run Code'}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('result');
              onSubmitCode();
            }}
            disabled={isRunning || isSubmitting}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition shadow-sm"
          >
            <Send className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
            <span>{isSubmitting ? 'Submitting...' : 'Submit Code'}</span>
          </button>
        </div>
      </div>

      {/* Console Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 text-xs font-mono text-slate-700">
        {/* TAB 1: Sample Test Cases */}
        {activeTab === 'testcases' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              {publicCases.map((tc, idx) => (
                <button
                  key={tc.id || idx}
                  onClick={() => setSelectedCaseIdx(idx)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                    selectedCaseIdx === idx
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  Case {idx + 1}
                </button>
              ))}
            </div>

            {publicCases[selectedCaseIdx] && (
              <div className="space-y-3">
                <div>
                  <span className="text-slate-500 font-sans block mb-1">Standard Input:</span>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-slate-800 whitespace-pre-wrap">
                    {publicCases[selectedCaseIdx].input}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 font-sans block mb-1">Expected Output:</span>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-emerald-700 font-semibold whitespace-pre-wrap">
                    {publicCases[selectedCaseIdx].expected_output}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Execution Result */}
        {activeTab === 'result' && (
          <div>
            {isRunning || isSubmitting ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-500 space-y-3">
                <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="font-sans text-xs">
                  {isSubmitting ? 'Evaluating hidden & public test cases...' : 'Executing code in Python environment...'}
                </span>
              </div>
            ) : lastRunResult ? (
              <div className="space-y-4">
                {/* Result Summary Banner */}
                <div
                  className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                    lastRunResult.status === 'Accepted'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 font-sans">
                    {lastRunResult.status === 'Accepted' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                    )}
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        {lastRunResult.status || 'Execution Finished'}
                      </h4>
                      <p className="text-xs opacity-90 text-slate-600">
                        {lastRunResult.passedCases !== undefined && lastRunResult.totalCases !== undefined
                          ? `${lastRunResult.passedCases}/${lastRunResult.totalCases} Test Cases Passed`
                          : 'Code executed successfully'}
                      </p>
                    </div>
                  </div>

                  {/* Execution Metrics */}
                  <div className="flex items-center gap-2.5 text-[11px] font-mono text-slate-700">
                    {lastRunResult.timeMs !== undefined && (
                      <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs">
                        Runtime: {lastRunResult.timeMs} ms
                      </span>
                    )}
                    {lastRunResult.score !== undefined && (
                      <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-200 font-bold shadow-xs">
                        Score: {lastRunResult.score} pts
                      </span>
                    )}
                  </div>
                </div>

                {/* Test case breakdown list */}
                {lastRunResult.caseResults && lastRunResult.caseResults.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-slate-500 font-sans text-xs">Test Case Results:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {lastRunResult.caseResults.map((cr, idx) => (
                        <div
                          key={cr.test_case_id || idx}
                          className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                            cr.passed
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-rose-50 border-rose-200 text-rose-700'
                          }`}
                        >
                          <div className="flex items-center gap-1 text-[11px] font-sans font-medium">
                            {cr.is_hidden && <Lock className="w-3 h-3 text-slate-400" />}
                            <span>{cr.is_hidden ? `Hidden #${idx + 1}` : `Case #${idx + 1}`}</span>
                          </div>
                          <span className="text-[10px] font-bold">
                            {cr.passed ? 'PASSED' : 'FAILED'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stderr Error Display if any */}
                {lastRunResult.stderr && (
                  <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl">
                    <span className="text-rose-700 font-sans block mb-1 font-semibold">Standard Error:</span>
                    <pre className="text-rose-600 text-xs whitespace-pre-wrap font-mono">
                      {lastRunResult.stderr}
                    </pre>
                  </div>
                )}

                {/* Stdout Display */}
                {lastRunResult.stdout && (
                  <div>
                    <span className="text-slate-500 font-sans block mb-1">Standard Output:</span>
                    <pre className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-800 whitespace-pre-wrap font-mono">
                      {lastRunResult.stdout}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 font-sans text-xs">
                Click "Run Code" to test sample cases or "Submit Code" to run all evaluation test cases.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Custom Input */}
        {activeTab === 'custom' && (
          <div className="space-y-3">
            <span className="text-slate-600 font-sans block text-xs">
              Provide your own standard input (stdin) for testing your solution:
            </span>
            <textarea
              rows={4}
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="e.g. 2 7 11 15&#10;9"
              className="glass-input w-full bg-slate-50 rounded-xl p-3 text-slate-900 border border-slate-200 focus:outline-none font-mono text-xs"
            />
          </div>
        )}
      </div>
    </div>
  );
};
