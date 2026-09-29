'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Sparkles,
  Layers,
  GraduationCap,
  Save,
  Check,
  Trash2,
  Edit3,
  X,
  Plus,
  ChevronLeft,
  Calendar,
  Clock,
  Award,
} from 'lucide-react';
import { PdfImportRecord, PdfImportQuestion } from '@/types';

export default function McqImportReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const importId = resolvedParams.id;

  const [importRecord, setImportRecord] = useState<PdfImportRecord | null>(null);
  const [questions, setQuestions] = useState<PdfImportQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'valid' | 'review' | 'duplicate'>('all');
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState<{
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: string;
    marks: number;
  }>({
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'A',
    marks: 2,
  });

  // Assessment creation modal
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [assessmentCode, setAssessmentCode] = useState('');
  const [assessmentDuration, setAssessmentDuration] = useState(60);
  const [assessmentQCount, setAssessmentQCount] = useState(30);
  const [assessmentMarksPerQ, setAssessmentMarksPerQ] = useState(2);
  const [assessmentPassingMarks, setAssessmentPassingMarks] = useState(24);
  const [assessmentStatus, setAssessmentStatus] = useState('published');

  useEffect(() => {
    loadImportDetails();
  }, [importId]);

  async function loadImportDetails() {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/mcq/import/${importId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setImportRecord(data.import);
        setQuestions(data.questions || []);

        // Pre-fill assessment modal defaults
        const fname = (data.import.filename || 'MCQ').replace(/\.[^/.]+$/, '');
        setAssessmentTitle(`${fname} Assessment – Year ${data.import.academic_year}`);
        setAssessmentCode(`JIT-Y${data.import.academic_year}-MCQ-${Math.floor(1000 + Math.random() * 9000)}`);
        const count = Math.min(30, data.questions?.length || 30);
        setAssessmentQCount(count);
        setAssessmentPassingMarks(Math.round(count * 2 * 0.4));
      } else {
        throw new Error(data.error || 'Failed to load import details.');
      }
    } catch (err: any) {
      console.error(err);
      setToastMessage(err?.message || 'Failed to load import data.');
    } finally {
      setLoading(false);
    }
  }

  const startEditing = (q: PdfImportQuestion) => {
    setEditingQId(q.id);
    setEditForm({
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer || 'A',
      marks: q.marks || 2,
    });
  };

  const handleSaveEdit = async (qId: string) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/mcq/import/${importId}/question/${qId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          status: 'VALID',
          review_notes: null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save question edit.');
      }

      setQuestions((prev) =>
        prev.map((q) =>
          q.id === qId
            ? {
                ...q,
                ...editForm,
                status: 'VALID',
                review_notes: null,
              }
            : q
        )
      );
      setEditingQId(null);
      setToastMessage('Question updated successfully.');
    } catch (err: any) {
      setToastMessage(err?.message || 'Failed to save edits.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveAllValid = async () => {
    try {
      setActionLoading(true);
      const validIds = questions.filter((q) => q.status === 'VALID' || q.status === 'APPROVED').map((q) => q.id);
      const res = await fetch(`/api/admin/mcq/import/${importId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds: validIds }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to approve questions.');
      }

      setQuestions((prev) =>
        prev.map((q) => (validIds.includes(q.id) ? { ...q, status: 'APPROVED' } : q))
      );
      setToastMessage(`✓ ${data.approvedCount} questions successfully approved into Question Bank!`);
    } catch (err: any) {
      setToastMessage(err?.message || 'Failed to approve questions.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateAssessment = async () => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/mcq/import/${importId}/create-assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: assessmentTitle,
          code: assessmentCode,
          year: importRecord?.academic_year || 2,
          duration_minutes: assessmentDuration,
          question_count: assessmentQCount,
          marks_per_question: assessmentMarksPerQ,
          passing_marks: assessmentPassingMarks,
          status: assessmentStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create assessment.');
      }

      setShowAssessmentModal(false);
      setToastMessage('✓ MCQ Assessment created and published successfully!');
      // Navigate to assessments list
      setTimeout(() => {
        router.push('/admin/tests');
      }, 1000);
    } catch (err: any) {
      setToastMessage(err?.message || 'Failed to create assessment.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredQuestions = questions.filter((q) => {
    if (activeFilter === 'valid') return q.status === 'VALID' || q.status === 'APPROVED';
    if (activeFilter === 'review') return q.status === 'NEEDS_REVIEW';
    if (activeFilter === 'duplicate') return q.status === 'DUPLICATE' || q.is_duplicate === 1;
    return true;
  });

  const validCount = questions.filter((q) => q.status === 'VALID' || q.status === 'APPROVED').length;
  const reviewCount = questions.filter((q) => q.status === 'NEEDS_REVIEW').length;
  const duplicateCount = questions.filter((q) => q.status === 'DUPLICATE' || q.is_duplicate === 1).length;

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-xs max-w-4xl mx-auto my-12">
        <Loader2 className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-900">Loading Extracted Questions...</p>
        <p className="text-xs text-slate-500 mt-1">Inspecting question paper structure and answer key mappings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 text-xs flex items-center gap-3 animate-fade-in">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/mcq/import"
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">PDF Import Review</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Year {importRecord?.academic_year} Pool
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Source: <strong className="text-slate-700">{importRecord?.filename}</strong> • {importRecord?.total_pages} Pages • Uploaded by Admin
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleApproveAllValid}
            disabled={actionLoading || validCount === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approve All Valid ({validCount})</span>
          </button>

          <button
            onClick={() => setShowAssessmentModal(true)}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-indigo-600/20 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create Assessment Directly</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Questions Detected</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{questions.length}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Answer Keys Detected</div>
          <div className="text-2xl font-extrabold text-indigo-600 mt-1">{importRecord?.answers_extracted || 0}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">✓ Valid Questions</div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">{validCount}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">⚠ Needs Review</div>
          <div className={`text-2xl font-extrabold mt-1 ${reviewCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
            {reviewCount}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Duplicates Detected</div>
          <div className={`text-2xl font-extrabold mt-1 ${duplicateCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
            {duplicateCount}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeFilter === 'all' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All Questions ({questions.length})
        </button>
        <button
          onClick={() => setActiveFilter('valid')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeFilter === 'valid' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Valid ({validCount})
        </button>
        <button
          onClick={() => setActiveFilter('review')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeFilter === 'review' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Needs Review ({reviewCount})
        </button>
        <button
          onClick={() => setActiveFilter('duplicate')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeFilter === 'duplicate' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Duplicates ({duplicateCount})
        </button>
      </div>

      {/* Question Cards List */}
      <div className="space-y-4">
        {filteredQuestions.map((q) => {
          const isEditing = editingQId === q.id;
          const isApproved = q.status === 'APPROVED';
          const isDuplicate = q.status === 'DUPLICATE' || q.is_duplicate === 1;
          const isReview = q.status === 'NEEDS_REVIEW';

          return (
            <div
              key={q.id}
              className={`bg-white rounded-3xl p-6 border shadow-xs transition ${
                isApproved
                  ? 'border-emerald-200/80 bg-emerald-50/10'
                  : isReview
                  ? 'border-amber-300 ring-2 ring-amber-400/20'
                  : isDuplicate
                  ? 'border-rose-200 bg-rose-50/10'
                  : 'border-slate-200'
              }`}
            >
              {isEditing ? (
                /* Edit Mode */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Editing Question {q.question_number}
                    </span>
                    <button
                      onClick={() => setEditingQId(null)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Question Text</label>
                    <textarea
                      rows={3}
                      value={editForm.question_text}
                      onChange={(e) => setEditForm({ ...editForm, question_text: e.target.value })}
                      className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-indigo-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Option A</label>
                      <input
                        type="text"
                        value={editForm.option_a}
                        onChange={(e) => setEditForm({ ...editForm, option_a: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Option B</label>
                      <input
                        type="text"
                        value={editForm.option_b}
                        onChange={(e) => setEditForm({ ...editForm, option_b: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Option C</label>
                      <input
                        type="text"
                        value={editForm.option_c}
                        onChange={(e) => setEditForm({ ...editForm, option_c: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Option D</label>
                      <input
                        type="text"
                        value={editForm.option_d}
                        onChange={(e) => setEditForm({ ...editForm, option_d: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Correct Answer</label>
                        <select
                          value={editForm.correct_answer}
                          onChange={(e) => setEditForm({ ...editForm, correct_answer: e.target.value })}
                          className="text-xs p-2 rounded-xl border border-slate-300 font-bold bg-white text-indigo-700"
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Marks</label>
                        <input
                          type="number"
                          value={editForm.marks}
                          onChange={(e) => setEditForm({ ...editForm, marks: Number(e.target.value) })}
                          className="w-20 text-xs p-2 rounded-xl border border-slate-300"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingQId(null)}
                        className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(q.id)}
                        disabled={actionLoading}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save & Validate</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        {q.question_number}
                      </span>
                      <div>
                        <span className="text-xs text-slate-400 font-mono">
                          Page {q.source_page} • Year {q.academic_year} • {q.marks || 2} Marks
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isApproved ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Approved in Bank</span>
                        </span>
                      ) : isReview ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Needs Review</span>
                        </span>
                      ) : isDuplicate ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                          Duplicate
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✓ Valid
                        </span>
                      )}

                      <button
                        onClick={() => startEditing(q)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition"
                        title="Edit question"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {q.review_notes && (
                    <div className="p-2.5 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                      <span>{q.review_notes}</span>
                    </div>
                  )}

                  <h3 className="text-sm font-semibold text-slate-900 leading-snug">{q.question_text}</h3>

                  {/* Options Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {[
                      { l: 'A', text: q.option_a },
                      { l: 'B', text: q.option_b },
                      { l: 'C', text: q.option_c },
                      { l: 'D', text: q.option_d },
                    ].map((opt) => {
                      const isCorrect = q.correct_answer === opt.l;
                      return (
                        <div
                          key={opt.l}
                          className={`p-2.5 rounded-xl border text-xs flex items-center gap-2.5 transition ${
                            isCorrect
                              ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-950 ring-1 ring-emerald-500/20'
                              : 'bg-slate-50 border-slate-200/80 text-slate-700'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 ${
                              isCorrect
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-white text-slate-500 border border-slate-300'
                            }`}
                          >
                            {opt.l}
                          </span>
                          <span className="truncate">{opt.text || <em className="text-slate-400">Empty</em>}</span>
                          {isCorrect && (
                            <span className="ml-auto text-[10px] text-emerald-700 font-extrabold uppercase tracking-wide">
                              Correct Key
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Assessment Modal */}
      {showAssessmentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Create Assessment from Import</h3>
              </div>
              <button
                onClick={() => setShowAssessmentModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Configure parameters for the automated 30-question assessment. Questions will be frozen and assigned with strict academic year isolation.
            </p>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assessment Title</label>
                <input
                  type="text"
                  value={assessmentTitle}
                  onChange={(e) => setAssessmentTitle(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assessment Code</label>
                <input
                  type="text"
                  value={assessmentCode}
                  onChange={(e) => setAssessmentCode(e.target.value.toUpperCase())}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono font-bold uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Question Count</label>
                  <input
                    type="number"
                    value={assessmentQCount}
                    onChange={(e) => {
                      const c = Number(e.target.value);
                      setAssessmentQCount(c);
                      setAssessmentPassingMarks(Math.round(c * assessmentMarksPerQ * 0.4));
                    }}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Marks per Question</label>
                  <input
                    type="number"
                    value={assessmentMarksPerQ}
                    onChange={(e) => {
                      const m = Number(e.target.value);
                      setAssessmentMarksPerQ(m);
                      setAssessmentPassingMarks(Math.round(assessmentQCount * m * 0.4));
                    }}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    value={assessmentDuration}
                    onChange={(e) => setAssessmentDuration(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Passing Marks</label>
                  <input
                    type="number"
                    value={assessmentPassingMarks}
                    onChange={(e) => setAssessmentPassingMarks(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
              </div>

              {/* Total Calculation Badge */}
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between text-xs text-indigo-900 font-semibold font-mono">
                <span>Total Score:</span>
                <span className="text-base font-extrabold text-indigo-700">
                  {assessmentQCount * assessmentMarksPerQ} Marks
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAssessmentModal(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCreateAssessment}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-indigo-600/20 flex items-center gap-2"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Create & Publish Assessment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
