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
  Edit3,
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

  // Form states for new question (3 test cases)
  const [newTitle, setNewTitle] = useState('');
  const [newYear, setNewYear] = useState<2 | 3>(2);
  const [newDifficulty, setNewDifficulty] = useState<DifficultyLevel>('Easy');
  const [newTopic, setNewTopic] = useState<QuestionTopic>('Lists');
  const [newMarks, setNewMarks] = useState(20);
  const [newDescription, setNewDescription] = useState('');
  const [newInputFormat, setNewInputFormat] = useState('');
  const [newOutputFormat, setNewOutputFormat] = useState('');
  const [newConstraints, setNewConstraints] = useState('');
  const [newStarterCode, setNewStarterCode] = useState('');
  // 3 Test Cases for New Question
  const [newTc1Input, setNewTc1Input] = useState('');
  const [newTc1Output, setNewTc1Output] = useState('');
  const [newTc2Input, setNewTc2Input] = useState('');
  const [newTc2Output, setNewTc2Output] = useState('');
  const [newTc3Input, setNewTc3Input] = useState('');
  const [newTc3Output, setNewTc3Output] = useState('');

  // Form states for editing question
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editYear, setEditYear] = useState<2 | 3>(2);
  const [editDifficulty, setEditDifficulty] = useState<DifficultyLevel>('Easy');
  const [editTopic, setEditTopic] = useState<QuestionTopic>('Lists');
  const [editMarks, setEditMarks] = useState(20);
  const [editDescription, setEditDescription] = useState('');
  const [editInputFormat, setEditInputFormat] = useState('');
  const [editOutputFormat, setEditOutputFormat] = useState('');
  const [editConstraints, setEditConstraints] = useState('');
  const [editStarterCode, setEditStarterCode] = useState('');
  const [editTc1Input, setEditTc1Input] = useState('');
  const [editTc1Output, setEditTc1Output] = useState('');
  const [editTc2Input, setEditTc2Input] = useState('');
  const [editTc2Output, setEditTc2Output] = useState('');
  const [editTc3Input, setEditTc3Input] = useState('');
  const [editTc3Output, setEditTc3Output] = useState('');

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

    if (!newTc1Output.trim()) {
      alert('Test Case 1 Expected Output is required. Every coding question must have exactly 3 test cases.');
      return;
    }
    if (!newTc2Output.trim()) {
      alert('Test Case 2 Expected Output is required. Every coding question must have exactly 3 test cases.');
      return;
    }
    if (!newTc3Output.trim()) {
      alert('Test Case 3 Expected Output is required. Every coding question must have exactly 3 test cases.');
      return;
    }

    testCases.push({
      id: `tc-1-${Date.now()}`,
      question_id: questionId,
      input: newTc1Input,
      expected_output: newTc1Output.trim(),
      is_hidden: false,
      weight: 1,
    });
    testCases.push({
      id: `tc-2-${Date.now()}`,
      question_id: questionId,
      input: newTc2Input,
      expected_output: newTc2Output.trim(),
      is_hidden: false,
      weight: 1,
    });
    testCases.push({
      id: `tc-3-${Date.now()}`,
      question_id: questionId,
      input: newTc3Input,
      expected_output: newTc3Output.trim(),
      is_hidden: true,
      weight: 1,
    });

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
        setNewTc1Input('');
        setNewTc1Output('');
        setNewTc2Input('');
        setNewTc2Output('');
        setNewTc3Input('');
        setNewTc3Output('');
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

  const openEditModal = (q: Question) => {
    setEditingQuestion(q);
    setEditTitle(q.title);
    setEditYear((Number(q.year) === 3 ? 3 : 2) as 2 | 3);
    setEditDifficulty((q.difficulty || 'Medium') as DifficultyLevel);
    setEditTopic((q.topic || 'Algorithms') as QuestionTopic);
    setEditMarks(Number(q.marks || 20));
    setEditDescription(q.description || '');
    setEditInputFormat(q.input_format || '');
    setEditOutputFormat(q.output_format || '');
    setEditConstraints(q.constraints || '');
    setEditStarterCode(q.starter_code || (q as any).initial_code || '');

    const tcs = Array.isArray(q.test_cases) ? q.test_cases : [];
    setEditTc1Input(tcs[0]?.input || '');
    setEditTc1Output(tcs[0]?.expected_output || (tcs[0] as any)?.output || '');
    setEditTc2Input(tcs[1]?.input || '');
    setEditTc2Output(tcs[1]?.expected_output || (tcs[1] as any)?.output || '');
    setEditTc3Input(tcs[2]?.input || '');
    setEditTc3Output(tcs[2]?.expected_output || (tcs[2] as any)?.output || '');
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    if (Number(editYear) !== 2 && Number(editYear) !== 3) {
      alert('Academic year must be 2 (2nd Year) or 3 (3rd Year).');
      return;
    }
    if (Number(editMarks) <= 0) {
      alert('Marks must be greater than 0.');
      return;
    }

    if (!editTc1Output.trim()) {
      alert('Test Case 1 Expected Output is required. Every coding question must have exactly 3 test cases.');
      return;
    }
    if (!editTc2Output.trim()) {
      alert('Test Case 2 Expected Output is required. Every coding question must have exactly 3 test cases.');
      return;
    }
    if (!editTc3Output.trim()) {
      alert('Test Case 3 Expected Output is required. Every coding question must have exactly 3 test cases.');
      return;
    }

    const updatedTestCases: TestCase[] = [
      {
        id: `tc-1-${Date.now()}`,
        question_id: editingQuestion.id,
        input: editTc1Input,
        expected_output: editTc1Output.trim(),
        is_hidden: false,
        weight: 1,
      },
      {
        id: `tc-2-${Date.now()}`,
        question_id: editingQuestion.id,
        input: editTc2Input,
        expected_output: editTc2Output.trim(),
        is_hidden: false,
        weight: 1,
      },
      {
        id: `tc-3-${Date.now()}`,
        question_id: editingQuestion.id,
        input: editTc3Input,
        expected_output: editTc3Output.trim(),
        is_hidden: true,
        weight: 1,
      },
    ];

    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/questions/${editingQuestion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription,
          year: Number(editYear),
          difficulty: editDifficulty,
          topic: editTopic,
          marks: Number(editMarks),
          starter_code: editStarterCode,
          initial_code: editStarterCode,
          test_cases: updatedTestCases,
          input_format: editInputFormat,
          output_format: editOutputFormat,
          constraints: editConstraints,
        }),
      });

      const data = await res.json();
      if (data.success && data.question) {
        setQuestions((prev) =>
          prev.map((q) => (q.id === editingQuestion.id ? { ...q, ...data.question } : q))
        );
        setEditingQuestion(null);
      } else {
        alert(data.error || 'Failed to update question');
      }
    } catch (err: any) {
      alert(err?.message || 'Error updating question');
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
                          onClick={() => openEditModal(q)}
                          className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-xl transition border border-transparent hover:border-indigo-200 mr-1"
                          title="Edit Question"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
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
                <label className="text-slate-700 font-semibold block mb-1.5">Python Starter Code (Optional)</label>
                <textarea
                  rows={4}
                  value={newStarterCode}
                  onChange={(e) => setNewStarterCode(e.target.value)}
                  placeholder="Optional starter code. Leave completely empty for clean blank editor."
                  className="w-full bg-slate-900 text-slate-100 font-mono text-xs rounded-xl p-3 focus:outline-none border border-slate-800"
                />
              </div>

              {/* Public Test Case 1 */}
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-200/60 space-y-3">
                <div className="font-semibold text-blue-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-600" />
                    <span>Test Case 1 (Public Sample • Visible to Candidate)</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800">PUBLIC</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-600 block mb-1">Standard Input</label>
                    <textarea
                      rows={2}
                      value={newTc1Input}
                      onChange={(e) => setNewTc1Input(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-mono text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                      placeholder="e.g. [2, 7, 11, 15]\n9"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">Expected Output</label>
                    <textarea
                      rows={2}
                      value={newTc1Output}
                      onChange={(e) => setNewTc1Output(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-mono text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                      placeholder="e.g. [0, 1]"
                    />
                  </div>
                </div>
              </div>

              {/* Public Test Case 2 */}
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-200/60 space-y-3">
                <div className="font-semibold text-indigo-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-600" />
                    <span>Test Case 2 (Public Sample • Visible to Candidate)</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">PUBLIC</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-600 block mb-1">Standard Input</label>
                    <textarea
                      rows={2}
                      value={newTc2Input}
                      onChange={(e) => setNewTc2Input(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-mono text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                      placeholder="e.g. [3, 2, 4]\n6"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">Expected Output</label>
                    <textarea
                      rows={2}
                      value={newTc2Output}
                      onChange={(e) => setNewTc2Output(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-mono text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                      placeholder="e.g. [1, 2]"
                    />
                  </div>
                </div>
              </div>

              {/* Hidden Test Case 3 */}
              <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/60 space-y-3">
                <div className="font-semibold text-amber-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <span>Test Case 3 (Hidden Evaluation • Automated Scoring Only)</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800">HIDDEN</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-600 block mb-1">Standard Input</label>
                    <textarea
                      rows={2}
                      value={newTc3Input}
                      onChange={(e) => setNewTc3Input(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-mono text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                      placeholder="e.g. [3, 3]\n6"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">Expected Output</label>
                    <textarea
                      rows={2}
                      value={newTc3Output}
                      onChange={(e) => setNewTc3Output(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-mono text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                      placeholder="e.g. [0, 1]"
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

      {/* Edit Question Modal (Requirement 8) */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Edit Question</h3>
                <span className="font-mono text-xs text-slate-400">({editingQuestion.id})</span>
              </div>
              <button
                onClick={() => setEditingQuestion(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateQuestion} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-slate-700 font-semibold block mb-1.5">Problem Title</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1.5">
                    Academic Year Pool <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editYear}
                    onChange={(e) => setEditYear(Number(e.target.value) as 2 | 3)}
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
                    value={editTopic}
                    onChange={(e) => setEditTopic(e.target.value as QuestionTopic)}
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
                    value={editDifficulty}
                    onChange={(e) => setEditDifficulty(e.target.value as DifficultyLevel)}
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
                    min={1}
                    value={editMarks}
                    onChange={(e) => setEditMarks(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">Problem Statement / Description</label>
                <textarea
                  rows={4}
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1.5">Input Format</label>
                  <input
                    type="text"
                    value={editInputFormat}
                    onChange={(e) => setEditInputFormat(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1.5">Output Format</label>
                  <input
                    type="text"
                    value={editOutputFormat}
                    onChange={(e) => setEditOutputFormat(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1.5">Constraints</label>
                  <input
                    type="text"
                    value={editConstraints}
                    onChange={(e) => setEditConstraints(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">Python Starter Code (Optional)</label>
                <textarea
                  rows={4}
                  value={editStarterCode}
                  onChange={(e) => setEditStarterCode(e.target.value)}
                  placeholder="Optional starter code. Leave completely empty for clean blank editor."
                  className="w-full bg-slate-900 text-slate-100 font-mono text-xs rounded-xl p-3 focus:outline-none border border-slate-800"
                />
              </div>

              {/* Public Test Case 1 */}
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-200/60 space-y-3">
                <div className="font-semibold text-blue-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-600" />
                    <span>Test Case 1 (Public Sample • Visible to Candidate)</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800">PUBLIC</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-600 block mb-1">Standard Input</label>
                    <textarea
                      rows={2}
                      value={editTc1Input}
                      onChange={(e) => setEditTc1Input(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-mono text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">Expected Output</label>
                    <textarea
                      rows={2}
                      value={editTc1Output}
                      onChange={(e) => setEditTc1Output(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-mono text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Public Test Case 2 */}
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-200/60 space-y-3">
                <div className="font-semibold text-indigo-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-600" />
                    <span>Test Case 2 (Public Sample • Visible to Candidate)</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">PUBLIC</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-600 block mb-1">Standard Input</label>
                    <textarea
                      rows={2}
                      value={editTc2Input}
                      onChange={(e) => setEditTc2Input(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-mono text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">Expected Output</label>
                    <textarea
                      rows={2}
                      value={editTc2Output}
                      onChange={(e) => setEditTc2Output(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-mono text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Hidden Test Case 3 */}
              <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/60 space-y-3">
                <div className="font-semibold text-amber-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <span>Test Case 3 (Hidden Evaluation • Automated Scoring Only)</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800">HIDDEN</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-600 block mb-1">Standard Input</label>
                    <textarea
                      rows={2}
                      value={editTc3Input}
                      onChange={(e) => setEditTc3Input(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-mono text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">Expected Output</label>
                    <textarea
                      rows={2}
                      value={editTc3Output}
                      onChange={(e) => setEditTc3Output(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-mono text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition shadow-xs flex items-center gap-2 disabled:opacity-50"
                >
                  {actionLoading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
