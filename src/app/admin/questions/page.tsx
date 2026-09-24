'use client';

import React, { useState } from 'react';
import { MOCK_QUESTIONS } from '@/lib/mockData';
import { Question, DifficultyLevel, QuestionTopic, TestCase } from '@/types';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  Code2,
  Lock,
  Eye,
  X,
  CheckCircle2,
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
  const [questions, setQuestions] = useState<Question[]>(MOCK_QUESTIONS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states for new question
  const [newTitle, setNewTitle] = useState('');
  const [newDifficulty, setNewDifficulty] = useState<DifficultyLevel>('Easy');
  const [newTopic, setNewTopic] = useState<QuestionTopic>('Lists');
  const [newMarks, setNewMarks] = useState(25);
  const [newDescription, setNewDescription] = useState('');
  const [newInputFormat, setNewInputFormat] = useState('');
  const [newOutputFormat, setNewOutputFormat] = useState('');
  const [newConstraints, setNewConstraints] = useState('');
  const [newStarterCode, setNewStarterCode] = useState(
    'def solution():\n    # Implement logic\n    pass\n\nif __name__ == "__main__":\n    solution()\n'
  );
  const [publicInput, setPublicInput] = useState('');
  const [publicOutput, setPublicOutput] = useState('');
  const [hiddenInput, setHiddenInput] = useState('');
  const [hiddenOutput, setHiddenOutput] = useState('');

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTopic = selectedTopic === 'all' || q.topic === selectedTopic;
    const matchesDiff = selectedDifficulty === 'all' || q.difficulty === selectedDifficulty;
    return matchesSearch && matchesTopic && matchesDiff;
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this question from the bank?')) {
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    }
  };

  const handleCreateQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    const testCases: TestCase[] = [];

    if (publicInput && publicOutput) {
      testCases.push({
        id: `tc-pub-${Date.now()}`,
        question_id: `q-${Date.now()}`,
        input: publicInput,
        expected_output: publicOutput,
        is_hidden: false,
        weight: 1,
      });
    }

    if (hiddenInput && hiddenOutput) {
      testCases.push({
        id: `tc-hid-${Date.now()}`,
        question_id: `q-${Date.now()}`,
        input: hiddenInput,
        expected_output: hiddenOutput,
        is_hidden: true,
        weight: 1,
      });
    }

    const newQ: Question = {
      id: `q-${Date.now()}`,
      title: newTitle,
      slug: newTitle.toLowerCase().replace(/\s+/g, '-'),
      difficulty: newDifficulty,
      topic: newTopic,
      marks: Number(newMarks),
      description: newDescription,
      input_format: newInputFormat,
      output_format: newOutputFormat,
      constraints: newConstraints,
      starter_code: newStarterCode,
      time_limit_ms: 2000,
      memory_limit_kb: 128000,
      is_active: true,
      test_cases: testCases,
    };

    setQuestions([newQ, ...questions]);
    setShowCreateModal(false);
    // Reset form
    setNewTitle('');
    setNewDescription('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-400" />
            <span>Python Question Bank Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Author algorithmic questions, public sample test cases, and secret evaluation cases
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-lg shadow-indigo-600/30"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Problem</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search problems by title, keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Topics (12 Topics)</option>
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
            className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Questions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4">Problem Title</th>
                <th className="py-3.5 px-3">Topic</th>
                <th className="py-3.5 px-3">Difficulty</th>
                <th className="py-3.5 px-3 text-center">Marks</th>
                <th className="py-3.5 px-3 text-center">Public Cases</th>
                <th className="py-3.5 px-3 text-center">Hidden Cases</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredQuestions.map((q) => {
                const publicCount = q.test_cases?.filter((tc) => !tc.is_hidden).length || 0;
                const hiddenCount = q.test_cases?.filter((tc) => tc.is_hidden).length || 0;

                return (
                  <tr key={q.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white text-sm">{q.title}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">/{q.slug}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                        {q.topic}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-medium ${
                          q.difficulty === 'Easy'
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : q.difficulty === 'Medium'
                            ? 'text-amber-400 bg-amber-500/10'
                            : 'text-rose-400 bg-rose-500/10'
                        }`}
                      >
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono font-bold text-indigo-400">
                      {q.marks} pts
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 text-slate-300 font-mono">
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        {publicCount}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 text-slate-300 font-mono">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        {hiddenCount}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition"
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

      {/* Create New Question Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <h3 className="font-bold text-white text-base">Add New Algorithmic Question</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuestion} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Problem Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Reverse Linked List"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Topic</label>
                  <select
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value as QuestionTopic)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {TOPICS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Difficulty</label>
                  <select
                    value={newDifficulty}
                    onChange={(e) => setNewDifficulty(e.target.value as DifficultyLevel)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Marks</label>
                  <input
                    type="number"
                    value={newMarks}
                    onChange={(e) => setNewMarks(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Problem Statement / Description</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain problem definition and requirements clearly..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Input Format</label>
                  <textarea
                    rows={2}
                    placeholder="Input specifications"
                    value={newInputFormat}
                    onChange={(e) => setNewInputFormat(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Output Format</label>
                  <textarea
                    rows={2}
                    placeholder="Output specifications"
                    value={newOutputFormat}
                    onChange={(e) => setNewOutputFormat(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Constraints</label>
                <input
                  type="text"
                  placeholder="e.g. 1 <= len(s) <= 10^4"
                  value={newConstraints}
                  onChange={(e) => setNewConstraints(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              {/* Public Test Case */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                <span className="font-semibold text-blue-400 block">Sample Public Test Case</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Sample Stdin Input"
                    value={publicInput}
                    onChange={(e) => setPublicInput(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-white font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Sample Expected Output"
                    value={publicOutput}
                    onChange={(e) => setPublicOutput(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-emerald-400 font-mono"
                  />
                </div>
              </div>

              {/* Hidden Test Case */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                <span className="font-semibold text-amber-400 block">Evaluation Hidden Test Case (Server-Only)</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Hidden Stdin Input"
                    value={hiddenInput}
                    onChange={(e) => setHiddenInput(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-white font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Hidden Expected Output"
                    value={hiddenOutput}
                    onChange={(e) => setHiddenOutput(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-emerald-400 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
