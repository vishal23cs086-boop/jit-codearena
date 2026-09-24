'use client';

import React, { useEffect, useState } from 'react';
import { Question, DifficultyLevel, QuestionTopic, TestCase } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Trash2,
  Lock,
  Eye,
  X,
  Code2,
  Award,
  Layers,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

const TOPICS: QuestionTopic[] = [
  'Variables',
  'Conditions',
  'Loops',
  'Functions',
  'Strings',
  'Lists',
  'Tuples',
  'Dictionaries',
  'OOP',
  'Recursion',
  'DSA',
  'Algorithms',
];

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<'all' | 2 | 3>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states for new question
  const [newTitle, setNewTitle] = useState('');
  const [newYear, setNewYear] = useState<2 | 3>(2);
  const [newDifficulty, setNewDifficulty] = useState<DifficultyLevel>('Easy');
  const [newTopic, setNewTopic] = useState<QuestionTopic>('Lists');
  const [newMarks, setNewMarks] = useState(25);
  const [newDescription, setNewDescription] = useState('');
  const [newInputFormat, setNewInputFormat] = useState('');
  const [newOutputFormat, setNewOutputFormat] = useState('');
  const [newConstraints, setNewConstraints] = useState('');
  const [newStarterCode, setNewStarterCode] = useState(
    'def solution():\n    # Implement solution\n    pass\n\nif __name__ == "__main__":\n    solution()\n'
  );
  const [publicInput, setPublicInput] = useState('');
  const [publicOutput, setPublicOutput] = useState('');
  const [hiddenInput, setHiddenInput] = useState('');
  const [hiddenOutput, setHiddenOutput] = useState('');

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/questions');
      const data = await res.json();
      if (data.success && Array.isArray(data.questions)) {
        setQuestions(data.questions);
      }
    } catch (err) {
      console.warn('Error loading questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const filteredQuestions = questions.filter((q) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      q.title.toLowerCase().includes(term) ||
      q.description.toLowerCase().includes(term);
    const matchesTopic = selectedTopic === 'all' || q.topic === selectedTopic;
    const matchesDiff = selectedDifficulty === 'all' || q.difficulty === selectedDifficulty;
    const matchesYear = selectedYear === 'all' || Number(q.year) === Number(selectedYear);
    return matchesSearch && matchesTopic && matchesDiff && matchesYear;
  });

  const year2Count = questions.filter((q) => Number(q.year) === 2).length;
  const year3Count = questions.filter((q) => Number(q.year) === 3).length;

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to permanently delete this question from the bank?')) {
      try {
        const res = await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setQuestions((prev) => prev.filter((q) => q.id !== id));
        }
      } catch (err) {
        console.error('Delete question error:', err);
      }
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const testCases: TestCase[] = [];
    const questionId = `q-${Date.now()}`;

    if (publicInput && publicOutput) {
      testCases.push({
        id: `tc-pub-${Date.now()}`,
        question_id: questionId,
        input: publicInput,
        expected_output: publicOutput,
        is_hidden: false,
        weight: 1,
      });
    }

    if (hiddenInput && hiddenOutput) {
      testCases.push({
        id: `tc-hid-${Date.now()}`,
        question_id: questionId,
        input: hiddenInput,
        expected_output: hiddenOutput,
        is_hidden: true,
        weight: 1,
      });
    }

    try {
      setActionLoading(true);
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription,
          year: Number(newYear),
          difficulty: newDifficulty,
          topic: newTopic,
          marks: Number(newMarks),
          initial_code: newStarterCode,
          test_cases: testCases,
          input_format: newInputFormat,
          output_format: newOutputFormat,
          constraints: newConstraints,
        }),
      });

      const data = await res.json();
      if (data.success && data.question) {
        setQuestions([data.question, ...questions]);
        setShowCreateModal(false);

        // Reset form
        setNewTitle('');
        setNewDescription('');
        setNewInputFormat('');
        setNewOutputFormat('');
        setNewConstraints('');
        setPublicInput('');
        setPublicOutput('');
        setHiddenInput('');
        setHiddenOutput('');
        setNewYear(2);
      } else {
        alert(data.error || 'Failed to save question');
      }
    } catch (err: any) {
      alert(err?.message || 'Error creating question');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-indigo-600" />
            <span>Question Bank Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Author year-specific algorithmic assessment challenges with public and hidden evaluation test cases
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-sm shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Problem</span>
        </button>
      </div>

      {/* Year Filter Buttons & Stats Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setSelectedYear('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedYear === 'all'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Years ({questions.length})
          </button>
          <button
            onClick={() => setSelectedYear(2)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              selectedYear === 2
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            2nd Year ({year2Count})
          </button>
          <button
            onClick={() => setSelectedYear(3)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              selectedYear === 3
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            3rd Year ({year3Count})
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium flex items-center gap-4">
          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            Year 2 Pool: {year2Count} Questions
          </span>
          <span className="inline-flex items-center gap-1 text-indigo-700 font-semibold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
            Year 3 Pool: {year3Count} Questions
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/90 backdrop-blur-xl p-3 rounded-2xl border border-slate-200/90 shadow-sm shadow-slate-900/5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search problems by title, keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 rounded-xl pl-9 pr-4 py-2 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl px-3 py-2 focus:bg-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Topics</option>
            {TOPICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl px-3 py-2 focus:bg-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Questions Table or Empty State */}
      {filteredQuestions.length > 0 ? (
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm shadow-slate-900/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-4 px-4">Problem Title</th>
                  <th className="py-4 px-3">Academic Pool</th>
                  <th className="py-4 px-3">Topic</th>
                  <th className="py-4 px-3">Difficulty</th>
                  <th className="py-4 px-3 text-center">Marks</th>
                  <th className="py-4 px-3 text-center">Public Cases</th>
                  <th className="py-4 px-3 text-center">Hidden Cases</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuestions.map((q) => {
                  const publicCount = q.test_cases?.filter((tc) => !tc.is_hidden).length || 0;
                  const hiddenCount = q.test_cases?.filter((tc) => tc.is_hidden).length || 0;
                  const isYear3 = Number(q.year) === 3;

                  return (
                    <tr key={q.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-900 text-sm">{q.title}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">/{q.slug || q.id}</div>
                      </td>
                      <td className="py-4 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                            isYear3
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isYear3 ? 'bg-indigo-500' : 'bg-emerald-500'
                            }`}
                          />
                          {isYear3 ? '3rd Year' : '2nd Year'}
                        </span>
                      </td>
                      <td className="py-4 px-3">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/60 text-slate-700 font-medium">
                          {q.topic}
                        </span>
                      </td>
                      <td className="py-4 px-3">
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-semibold border ${
                            q.difficulty === 'Easy'
                              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                              : q.difficulty === 'Medium'
                              ? 'text-amber-700 bg-amber-50 border-amber-200'
                              : 'text-rose-700 bg-rose-50 border-rose-200'
                          }`}
                        >
                          {q.difficulty}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-center font-mono font-bold text-indigo-600">
                        {q.marks} pts
                      </td>
                      <td className="py-4 px-3 text-center">
                        <span className="inline-flex items-center gap-1.5 text-slate-600 font-mono">
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          {publicCount}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-center">
                        <span className="inline-flex items-center gap-1.5 text-slate-600 font-mono">
                          <Lock className="w-3.5 h-3.5 text-amber-600" />
                          {hiddenCount}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleDelete(q.id)}
                          className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition border border-transparent hover:border-rose-200"
                          title="Delete Question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          title={
            selectedYear === 'all'
              ? 'No questions available yet'
              : `No ${selectedYear === 2 ? '2nd' : '3rd'} Year questions found`
          }
          description="Create algorithmic challenges with public sample test cases and hidden evaluation assertions to populate this question pool."
          action={{
            label: '+ Create Question',
            onClick: () => setShowCreateModal(true),
          }}
        />
      )}

      {/* Create New Question Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Add New Question</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuestion} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-slate-700 font-semibold block mb-1.5">Problem Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Reverse a Linked List"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1.5">
                    Academic Year Pool <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newYear}
                    onChange={(e) => setNewYear(Number(e.target.value) as 2 | 3)}
                    className="w-full bg-slate-50 border border-indigo-200 rounded-xl p-3 text-slate-800 font-bold focus:bg-white focus:outline-none focus:border-indigo-500 shadow-xs"
                  >
                    <option value={2}>2nd Year (Pool 2)</option>
                    <option value={3}>3rd Year (Pool 3)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1.5">Topic</label>
                  <select
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value as QuestionTopic)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 focus:bg-white focus:outline-none focus:border-indigo-500"
                  >
                    {TOPICS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1.5">Difficulty</label>
                  <select
                    value={newDifficulty}
                    onChange={(e) => setNewDifficulty(e.target.value as DifficultyLevel)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 focus:bg-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1.5">Marks</label>
                  <input
                    type="number"
                    value={newMarks}
                    onChange={(e) => setNewMarks(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">Problem Statement / Description</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain problem requirements clearly..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1.5">Input Format</label>
                  <input
                    type="text"
                    placeholder="e.g. Single line integer n"
                    value={newInputFormat}
                    onChange={(e) => setNewInputFormat(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1.5">Output Format</label>
                  <input
                    type="text"
                    placeholder="e.g. Print true or false"
                    value={newOutputFormat}
                    onChange={(e) => setNewOutputFormat(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1.5">Constraints</label>
                  <input
                    type="text"
                    placeholder="e.g. 1 <= n <= 10^5"
                    value={newConstraints}
                    onChange={(e) => setNewConstraints(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">Python Starter Code</label>
                <textarea
                  rows={4}
                  value={newStarterCode}
                  onChange={(e) => setNewStarterCode(e.target.value)}
                  className="w-full bg-slate-900 text-slate-100 font-mono text-xs rounded-xl p-3 focus:outline-none border border-slate-800"
                />
              </div>

              {/* Public Test Case */}
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-200/60 space-y-3">
                <div className="font-semibold text-blue-900 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span>Public Sample Test Case (Visible to candidate)</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-600 block mb-1">Standard Input</label>
                    <textarea
                      rows={2}
                      value={publicInput}
                      onChange={(e) => setPublicInput(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-mono text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                      placeholder="e.g. [2,7,11,15]\n9"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">Expected Output</label>
                    <textarea
                      rows={2}
                      value={publicOutput}
                      onChange={(e) => setPublicOutput(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-mono text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                      placeholder="e.g. [0, 1]"
                    />
                  </div>
                </div>
              </div>

              {/* Hidden Test Case */}
              <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/60 space-y-3">
                <div className="font-semibold text-amber-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>Hidden Test Case (Automated scoring only)</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-600 block mb-1">Standard Input</label>
                    <textarea
                      rows={2}
                      value={hiddenInput}
                      onChange={(e) => setHiddenInput(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-mono text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                      placeholder="e.g. [3,2,4]\n6"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">Expected Output</label>
                    <textarea
                      rows={2}
                      value={hiddenOutput}
                      onChange={(e) => setHiddenOutput(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-mono text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                      placeholder="e.g. [1, 2]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition shadow-xs flex items-center gap-2 disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save to Question Bank'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
