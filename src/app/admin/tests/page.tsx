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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Layers className="w-7 h-7 text-indigo-400" />
            <span>Institutional Assessment Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Schedule tests, configure eligible departments, publish and invigilate coding examinations
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
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
              className="glass-card glass-card-hover rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-5 border border-white/10"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                      t.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : t.status === 'published'
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        : 'bg-white/[0.04] text-slate-400 border-white/10'
                    }`}
                  >
                    {t.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                    {t.status.toUpperCase()}
                  </span>

                  <span className="text-xs text-slate-400 font-mono">
                    {t.questions?.length || 0} Problems
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">{t.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                  {t.description}
                </p>

                <div className="grid grid-cols-2 gap-2 mt-5 text-xs text-slate-300 font-mono bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                  <span className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Duration: <strong className="text-white">{t.duration_minutes}m</strong></span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Marks: <strong className="text-emerald-400">{t.total_marks}</strong></span>
                  </span>
                  <span className="col-span-2 text-[11px] text-slate-400 pt-1 block truncate">
                    Eligible: <strong className="text-indigo-400">{t.eligible_departments?.join(', ')}</strong> (Years: {t.eligible_years?.join(', ')})
                  </span>
                </div>
              </div>

              {/* Actions Toolbar */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  {t.status !== 'active' ? (
                    <button
                      onClick={() => handleStatusChange(t.id, 'active')}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl font-semibold transition"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Start Assessment</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStatusChange(t.id, 'ended')}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl font-semibold transition"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      <span>End Assessment</span>
                    </button>
                  )}

                  {t.status === 'published' && (
                    <button
                      onClick={() => handleStatusChange(t.id, 'draft')}
                      className="px-3 py-1.5 glass-card-hover text-slate-400 hover:text-white rounded-xl transition border border-white/10"
                    >
                      Unpublish
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/monitor`}
                    className="px-3 py-1.5 glass-card-hover text-slate-300 hover:text-white rounded-xl font-medium transition border border-white/10"
                  >
                    Monitor
                  </Link>
                  <Link
                    href={`/admin/rankings/${t.id}`}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition shadow-md shadow-indigo-600/20"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card border border-white/10 rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col p-6 sm:p-7 shadow-2xl overflow-hidden relative">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="font-bold text-white text-base">Create & Schedule Assessment</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTest} className="mt-5 flex-1 overflow-y-auto space-y-4 text-xs pr-1">
              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">Assessment Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2nd Year Python Assessment 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 focus:bg-white/[0.08] focus:outline-none focus:border-indigo-500/50 text-sm"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">Assessment Instructions</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Instructions for students..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 focus:bg-white/[0.08] focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1.5">Duration (Minutes)</label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-3 text-white focus:bg-white/[0.08] focus:outline-none focus:border-indigo-500/50 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1.5">Total Marks</label>
                  <input
                    type="number"
                    value={marks}
                    onChange={(e) => setMarks(Number(e.target.value))}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-3 text-white focus:bg-white/[0.08] focus:outline-none focus:border-indigo-500/50 font-mono"
                  />
                </div>
              </div>

              {/* Department Checkboxes */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">Eligible Departments</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {DEPARTMENTS.map((dept) => (
                    <button
                      type="button"
                      key={dept}
                      onClick={() => handleToggleDept(dept)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                        selectedDepts.includes(dept)
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                          : 'bg-white/[0.04] text-slate-300 border-white/10 hover:bg-white/[0.08]'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </div>

              {/* Year Checkboxes */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">Eligible Academic Years</label>
                <div className="flex gap-2 pt-1">
                  {[1, 2, 3, 4].map((yr) => (
                    <button
                      type="button"
                      key={yr}
                      onClick={() => handleToggleYear(yr)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                        selectedYears.includes(yr)
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                          : 'bg-white/[0.04] text-slate-300 border-white/10 hover:bg-white/[0.08]'
                      }`}
                    >
                      Year {yr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Select Questions from Question Bank */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">
                  Select Problems from Question Bank ({selectedQuestionIds.length} Selected)
                </label>
                {availableQuestions.length > 0 ? (
                  <div className="max-h-44 overflow-y-auto space-y-1.5 p-2 bg-black/40 rounded-2xl border border-white/10">
                    {availableQuestions.map((q) => (
                      <label
                        key={q.id}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.04] cursor-pointer transition text-xs border border-transparent hover:border-white/5"
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={selectedQuestionIds.includes(q.id)}
                            onChange={() => handleToggleQuestion(q.id)}
                            className="rounded bg-white/[0.04] border-white/20 text-indigo-500 focus:ring-0"
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

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 glass-card-hover text-slate-400 hover:text-white font-medium rounded-xl transition border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition shadow-lg shadow-indigo-600/20"
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
