'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchTests, saveTest, fetchQuestions } from '@/lib/db';
import { Test, TestStatus, Question } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Layers,
  Plus,
  Play,
  Square,
  Calendar,
  Clock,
  Award,
  Users,
  CheckCircle2,
  X,
  FileCode,
} from 'lucide-react';

const DEPARTMENTS = ['CSE', 'IT', 'AI&DS', 'ECE', 'MECH', 'CIVIL', 'EEE', 'CSBS'];

export default function TestManagementPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(60);
  const [marks, setMarks] = useState(100);
  const [selectedDepts, setSelectedDepts] = useState<string[]>(['CSE', 'IT', 'AI&DS', 'ECE']);
  const [selectedYears, setSelectedYears] = useState<number[]>([2, 3]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [testsData, questionsData] = await Promise.all([
          fetchTests(),
          fetchQuestions(),
        ]);
        setTests(testsData);
        setAvailableQuestions(questionsData);
      } catch (err) {
        console.warn('Error loading tests:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleStatusChange = async (id: string, newStatus: TestStatus) => {
    const target = tests.find((t) => t.id === id);
    if (!target) return;
    const updated = { ...target, status: newStatus };
    await saveTest(updated);
    setTests((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  const handleToggleDept = (dept: string) => {
    setSelectedDepts((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  };

  const handleToggleYear = (yr: number) => {
    setSelectedYears((prev) =>
      prev.includes(yr) ? prev.filter((y) => y !== yr) : [...prev, yr]
    );
  };

  const handleToggleQuestion = (qId: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    );
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const testId = `test-${Date.now()}`;
    const newTest: Test = {
      id: testId,
      title: title.trim(),
      description: description.trim(),
      duration_minutes: Number(duration),
      total_marks: Number(marks),
      eligible_years: selectedYears.length ? selectedYears : [1, 2, 3, 4],
      eligible_departments: selectedDepts.length ? selectedDepts : ['CSE'],
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 86400000 * 7).toISOString(),
      status: 'published',
      questions: selectedQuestionIds.map((qid, idx) => {
        const q = availableQuestions.find((item) => item.id === qid);
        return {
          id: `tq-${testId}-${idx}`,
          test_id: testId,
          question_id: qid,
          order_index: idx + 1,
          marks: q ? q.marks : 25,
          question: q,
        };
      }),
      created_at: new Date().toISOString(),
    };

    await saveTest(newTest);
    setTests([newTest, ...tests]);
    setShowCreateModal(false);

    // Reset form
    setTitle('');
    setDescription('');
    setSelectedQuestionIds([]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-400" />
            <span>Institutional Assessment Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Schedule tests, configure eligible departments, publish and invigilate coding examinations
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-lg shadow-indigo-600/30"
        >
          <Plus className="w-4 h-4" />
          <span>Create Assessment</span>
        </button>
      </div>

      {/* Tests Grid or Empty State */}
      {tests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tests.map((t) => (
            <div
              key={t.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-4 shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      t.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse'
                        : t.status === 'published'
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {t.status.toUpperCase()}
                  </span>

                  <span className="text-xs text-slate-400 font-mono">
                    {t.questions?.length || 0} Questions
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-1.5">{t.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                  {t.description}
                </p>

                <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-slate-300 font-mono bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    Duration: {t.duration_minutes}m
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-emerald-400" />
                    Marks: {t.total_marks}
                  </span>
                  <span className="col-span-2 text-[11px] text-slate-400">
                    Eligible: {t.eligible_departments?.join(', ')} (Years: {t.eligible_years?.join(', ')})
                  </span>
                </div>
              </div>

              {/* Actions Toolbar */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  {t.status !== 'active' ? (
                    <button
                      onClick={() => handleStatusChange(t.id, 'active')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg font-medium transition"
                    >
                      <Play className="w-3 h-3" />
                      <span>Start Assessment</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStatusChange(t.id, 'ended')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/30 rounded-lg font-medium transition"
                    >
                      <Square className="w-3 h-3" />
                      <span>End Assessment</span>
                    </button>
                  )}

                  {t.status === 'published' && (
                    <button
                      onClick={() => handleStatusChange(t.id, 'draft')}
                      className="px-2.5 py-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                    >
                      Unpublish
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/monitor`}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition"
                  >
                    Monitor
                  </Link>
                  <Link
                    href={`/admin/rankings/${t.id}`}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition"
                  >
                    Leaderboard
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No assessments scheduled yet."
          description="Create your first coding test, set eligible cohorts, select questions from the bank, and publish for candidates."
          action={{
            label: "+ CREATE ASSESSMENT",
            onClick: () => setShowCreateModal(true),
          }}
        />
      )}

      {/* Create Test Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col p-6 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Create & Schedule Assessment</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTest} className="mt-4 flex-1 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Assessment Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2nd Year Python Assessment 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Assessment Instructions</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Instructions for students..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Total Marks</label>
                  <input
                    type="number"
                    value={marks}
                    onChange={(e) => setMarks(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              {/* Department Checkboxes */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Eligible Departments</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {DEPARTMENTS.map((dept) => (
                    <button
                      type="button"
                      key={dept}
                      onClick={() => handleToggleDept(dept)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition border ${
                        selectedDepts.includes(dept)
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </div>

              {/* Year Checkboxes */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Eligible Academic Years</label>
                <div className="flex gap-2 pt-1">
                  {[1, 2, 3, 4].map((yr) => (
                    <button
                      type="button"
                      key={yr}
                      onClick={() => handleToggleYear(yr)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition border ${
                        selectedYears.includes(yr)
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      Year {yr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Select Questions from Question Bank */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Select Problems from Question Bank ({selectedQuestionIds.length} Selected)
                </label>
                {availableQuestions.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-slate-950 rounded-xl border border-slate-800">
                    {availableQuestions.map((q) => (
                      <label
                        key={q.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-900 cursor-pointer transition text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedQuestionIds.includes(q.id)}
                            onChange={() => handleToggleQuestion(q.id)}
                            className="rounded text-indigo-600 bg-slate-800 border-slate-700"
                          />
                          <span className="font-semibold text-white">{q.title}</span>
                          <span className="text-[10px] text-slate-400">({q.topic})</span>
                        </div>
                        <span className="text-indigo-400 font-mono font-bold">{q.marks} pts</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-xs italic">
                    Question bank is currently empty. You can add questions from the Question Bank tab.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl"
                >
                  Save & Publish Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
