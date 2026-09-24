'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MOCK_TESTS, MOCK_QUESTIONS } from '@/lib/mockData';
import { Test, TestStatus } from '@/types';
import {
  Layers,
  Plus,
  Play,
  Square,
  Eye,
  Calendar,
  Clock,
  Award,
  Users,
  CheckCircle2,
  X,
} from 'lucide-react';

export default function TestManagementPage() {
  const [tests, setTests] = useState<Test[]>(MOCK_TESTS);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(60);
  const [marks, setMarks] = useState(100);
  const [dept, setDept] = useState('CSE, IT, AI&DS, ECE');
  const [years, setYears] = useState('2, 3');

  const handleStatusChange = (id: string, newStatus: TestStatus) => {
    setTests((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );
  };

  const handleCreateTest = (e: React.FormEvent) => {
    e.preventDefault();
    const newTest: Test = {
      id: `test-${Date.now()}`,
      title,
      description,
      duration_minutes: Number(duration),
      total_marks: Number(marks),
      eligible_years: years.split(',').map((y) => Number(y.trim())),
      eligible_departments: dept.split(',').map((d) => d.trim()),
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 86400000 * 7).toISOString(),
      status: 'published',
      questions: MOCK_QUESTIONS.slice(0, 3).map((q, idx) => ({
        id: `tq-${q.id}`,
        test_id: `test-${Date.now()}`,
        question_id: q.id,
        order_index: idx + 1,
        marks: 25,
        question: q,
      })),
    };

    setTests([newTest, ...tests]);
    setShowCreateModal(false);
    setTitle('');
    setDescription('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-400" />
            <span>Test Management & Scheduling</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Create departmental tests, configure eligible years, start/end examinations
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-lg shadow-indigo-600/30"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Test</span>
        </button>
      </div>

      {/* Tests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tests.map((t) => (
          <div
            key={t.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-xl relative overflow-hidden"
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
                  {t.questions?.length || 4} Questions
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-1.5">{t.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                {t.description}
              </p>

              <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-slate-300 font-mono bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Duration: {t.duration_minutes}m
                </span>
                <span className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-emerald-400" />
                  Marks: {t.total_marks}
                </span>
                <span className="col-span-2 text-[11px] text-slate-400">
                  Eligible: Years {t.eligible_years.join(', ')} ({t.eligible_departments.join(', ')})
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
                    <span>Start Test</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleStatusChange(t.id, 'ended')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/30 rounded-lg font-medium transition"
                  >
                    <Square className="w-3 h-3" />
                    <span>End Test</span>
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
                  Live Monitor
                </Link>
                <Link
                  href={`/admin/rankings/${t.id}`}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition"
                >
                  Rankings
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Test Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Schedule New Examination</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTest} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Assessment Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2nd Year Python Assessment Cycle 2"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Instructions / Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Test instructions..."
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Eligible Years</label>
                  <input
                    type="text"
                    value={years}
                    onChange={(e) => setYears(e.target.value)}
                    placeholder="e.g. 2, 3"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Eligible Departments</label>
                  <input
                    type="text"
                    value={dept}
                    onChange={(e) => setDept(e.target.value)}
                    placeholder="CSE, IT, AI&DS"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
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
                  Create & Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
