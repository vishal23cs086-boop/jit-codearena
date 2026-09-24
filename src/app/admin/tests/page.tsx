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
  ExternalLink,
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Layers className="w-7 h-7 text-indigo-600" />
            <span>Institutional Assessment Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Schedule tests, configure eligible departments, publish and invigilate coding examinations
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-sm shadow-indigo-600/20"
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
              className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-5 border border-slate-200/90 shadow-sm shadow-slate-900/5 hover:border-slate-300 hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                      t.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : t.status === 'published'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    {t.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                    {t.status.toUpperCase()}
                  </span>

                  <span className="text-xs text-slate-500 font-mono">
                    {t.questions?.length || 0} Problems
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-2">{t.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                  {t.description}
                </p>

                <div className="grid grid-cols-2 gap-2 mt-5 text-xs text-slate-600 font-mono bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                  <span className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Duration: <strong className="text-slate-900">{t.duration_minutes}m</strong></span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Marks: <strong className="text-emerald-700">{t.total_marks}</strong></span>
                  </span>
                  <span className="col-span-2 text-[11px] text-slate-500 pt-1 block truncate">
                    Eligible: <strong className="text-indigo-600 font-semibold">{t.eligible_departments?.join(', ')}</strong> (Years: {t.eligible_years?.join(', ')})
                  </span>
                </div>
              </div>

              {/* Actions Toolbar */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  {t.status !== 'active' ? (
                    <button
                      onClick={() => handleStatusChange(t.id, 'active')}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl font-semibold transition"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Start Assessment</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStatusChange(t.id, 'ended')}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl font-semibold transition"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      <span>End Assessment</span>
                    </button>
                  )}

                  {t.status === 'published' && (
                    <button
                      onClick={() => handleStatusChange(t.id, 'draft')}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-xl transition border border-slate-200 shadow-sm"
                    >
                      Unpublish
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/monitor`}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-xl font-medium transition border border-slate-200 shadow-sm"
                  >
                    Monitor
                  </Link>
                  <Link
                    href={`/admin/rankings/${t.id}`}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition shadow-sm shadow-indigo-600/20"
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
          title="No assessments scheduled yet"
          description="Create your first coding test, set eligible cohorts, select questions from the bank, and publish for candidates."
          action={{
            label: "+ Create Assessment",
            onClick: () => setShowCreateModal(true),
          }}
        />
      )}

      {/* Create Test Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col p-6 sm:p-7 shadow-2xl overflow-hidden relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Create & Schedule Assessment</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTest} className="mt-5 flex-1 overflow-y-auto space-y-4 text-xs pr-1">
              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">Assessment Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2nd Year Python Assessment 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">Assessment Instructions</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Instructions for students..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1.5">Duration (Minutes)</label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1.5">Total Marks</label>
                  <input
                    type="number"
                    value={marks}
                    onChange={(e) => setMarks(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Department Checkboxes */}
              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">Eligible Departments</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {DEPARTMENTS.map((dept) => (
                    <button
                      type="button"
                      key={dept}
                      onClick={() => handleToggleDept(dept)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                        selectedDepts.includes(dept)
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200/70'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </div>

              {/* Year Checkboxes */}
              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">Eligible Academic Years</label>
                <div className="flex gap-2 pt-1">
                  {[1, 2, 3, 4].map((yr) => (
                    <button
                      type="button"
                      key={yr}
                      onClick={() => handleToggleYear(yr)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                        selectedYears.includes(yr)
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200/70'
                      }`}
                    >
                      Year {yr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Select Questions from Question Bank */}
              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">
                  Select Problems from Question Bank ({selectedQuestionIds.length} Selected)
                </label>
                {availableQuestions.length > 0 ? (
                  <div className="max-h-44 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-2xl border border-slate-200">
                    {availableQuestions.map((q) => (
                      <label
                        key={q.id}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white cursor-pointer transition text-xs border border-transparent hover:border-slate-200 hover:shadow-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={selectedQuestionIds.includes(q.id)}
                            onChange={() => handleToggleQuestion(q.id)}
                            className="rounded bg-white border-slate-300 text-indigo-600 focus:ring-0"
                          />
                          <span className="font-semibold text-slate-900">{q.title}</span>
                          <span className="text-[10px] text-slate-500">({q.topic})</span>
                        </div>
                        <span className="text-indigo-600 font-mono font-bold">{q.marks} pts</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-xs italic">
                    Question bank is currently empty. You can add questions from the Question Bank tab.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 font-medium rounded-xl transition border border-slate-200 shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition shadow-sm shadow-indigo-600/20"
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
