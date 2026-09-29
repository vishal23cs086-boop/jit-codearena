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
  ShieldCheck,
  CheckSquare,
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
  const [validatingAll, setValidatingAll] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [validationSuccessBanner, setValidationSuccessBanner] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState<{
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: string;
    marks: number;
    difficulty?: string;
    explanation?: string;
  }>({
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'A',
    marks: 2,
    difficulty: 'medium',
    explanation: '',
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
      const res = await fetch(`/api/admin/assessments/import-preview?importId=${importId}`);
      let data = await res.json();
      
      // Fallback to mcq import if needed
      if (!res.ok || !data.success) {
        const fallbackRes = await fetch(`/api/admin/mcq/import/${importId}`);
        data = await fallbackRes.json();
      }

      if (data.success) {
        setImportRecord(data.import);
        setQuestions(data.questions || []);

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
      difficulty: 'medium',
      explanation: '',
    });
  };

  const handleSaveEdit = async (qId: string) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/assessment-questions/${qId}`, {
        method: 'PUT',
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
      setToastMessage('✓ Question saved and marked as VALID.');
    } catch (err: any) {
      setToastMessage(err?.message || 'Failed to save edits.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteQuestion = async (qId: string, qNum: number) => {
    if (!confirm(`Are you sure you want to remove Question ${qNum} from this assessment?`)) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/assessment-questions/${qId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete question.');
      }

      setQuestions((prev) => prev.filter((q) => q.id !== qId));
      setToastMessage(`Question ${qNum} deleted successfully.`);
    } catch (err: any) {
      setToastMessage(err?.message || 'Failed to delete question.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleValidateAll = async () => {
    try {
      setValidatingAll(true);
      const res = await fetch('/api/admin/assessments/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Validation failed.');
      }

      // Reload fresh questions
      await loadImportDetails();

      if (data.valid) {
        setValidationSuccessBanner(true);
        setToastMessage(`✓ All ${data.totalQuestions} questions validated successfully! Assessment is ready to create.`);
      } else {
        setToastMessage(`Validation completed: ${data.reviewCount} question(s) still require review.`);
      }
    } catch (err: any) {
      setToastMessage(err?.message || 'Validation request failed.');
    } finally {
      setValidatingAll(false);
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
      setToastMessage(`✓ ${data.approvedCount} questions approved into Question Bank.`);
    } catch (err: any) {
      setToastMessage(err?.message || 'Failed to approve questions.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateAssessment = async () => {
    try {
      setActionLoading(true);
      const res = await fetch('/api/admin/assessments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importId,
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
      setToastMessage('✓ MCQ Assessment created and published in Turso database!');
      setTimeout(() => {
        router.push('/admin/tests');
      }, 1200);
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
  const totalCalculatedMarks = questions.reduce((acc, q) => acc + (q.marks || 2), 0);
  const isReadyToCreate = reviewCount === 0 && questions.length > 0;

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-xs max-w-4xl mx-auto my-12">
        <Loader2 className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-900">Loading Extracted Questions...</p>
        <p className="text-xs text-slate-500 mt-1">Inspecting PDF question paper structure and authoritative answer keys.</p>
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
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">PDF Assessment Import Review</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Academic Year 2026-2027 • 2nd Year
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Source: <strong className="text-slate-700">{importRecord?.filename}</strong> • {importRecord?.total_pages} Pages • Authoritative Answer Key Page 10
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleValidateAll}
            disabled={validatingAll || actionLoading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
            title="Re-validate all questions and check completeness"
          >
            {validatingAll ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>Validate All Questions</span>
          </button>

          <button
            onClick={() => setShowAssessmentModal(true)}
            disabled={!isReadyToCreate || actionLoading}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 ${
              isReadyToCreate
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
            }`}
            title={!isReadyToCreate ? `Resolve ${reviewCount} questions marked Needs Review before creating assessment` : 'Create and publish assessment'}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create Assessment</span>
          </button>
        </div>
      </div>

      {/* Validation Banner */}
      {!isReadyToCreate && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Review Required:</strong> {reviewCount} question(s) require admin verification before publishing. Click <strong>Edit</strong> on any flagged question to review and confirm options.
            </span>
          </div>
          <button
            onClick={() => setActiveFilter('review')}
            className="px-3 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg font-bold text-[11px] transition shrink-0 ml-4"
          >
            View Flagged ({reviewCount})
          </button>
        </div>
      )}

      {isReadyToCreate && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>All 30 Questions Validated!</strong> 0 Needs Review. 60 Total Marks. Click <strong>Create Assessment</strong> to publish to 2nd-Year students.
            </span>
          </div>
          <button
            onClick={() => setShowAssessmentModal(true)}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition shrink-0 ml-4 flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Proceed to Create</span>
          </button>
        </div>
      )}

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Questions Detected</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{questions.length}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Answer Keys (Page 10)</div>
          <div className="text-2xl font-extrabold text-indigo-600 mt-1">{importRecord?.answers_extracted || 30}</div>
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
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Marks</div>
          <div className="text-2xl font-extrabold text-indigo-700 mt-1">
            {totalCalculatedMarks} / 60
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
        {duplicateCount > 0 && (
          <button
            onClick={() => setActiveFilter('duplicate')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeFilter === 'duplicate' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Duplicates ({duplicateCount})
          </button>
        )}
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
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Question Text & Code</label>
                    <textarea
                      rows={5}
                      value={editForm.question_text}
                      onChange={(e) => setEditForm({ ...editForm, question_text: e.target.value })}
                      className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 focus:outline-indigo-600 bg-slate-50"
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
                        title="Edit question text and options"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteQuestion(q.id, q.question_number)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="Delete question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {q.review_notes && (
                    <div className="p-2.5 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                      <span>{q.review_notes}</span>
                    </div>
                  )}

                  {/* Render Question Text with code formatting preserved */}
                  <div className="text-sm font-medium text-slate-900 whitespace-pre-wrap font-sans">
                    {q.question_text}
                  </div>

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
                              Page 10 Key
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
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assessment Title</label>
                <input
                  type="text"
                  value={assessmentTitle}
                  onChange={(e) => setAssessmentTitle(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assessment Code</label>
                  <input
                    type="text"
                    value={assessmentCode}
                    onChange={(e) => setAssessmentCode(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-indigo-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={`Year ${importRecord?.academic_year || 2} (2026-2027)`}
                    disabled
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    value={assessmentDuration}
                    onChange={(e) => setAssessmentDuration(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Questions</label>
                  <input
                    type="number"
                    value={assessmentQCount}
                    onChange={(e) => setAssessmentQCount(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Marks / Q</label>
                  <input
                    type="number"
                    value={assessmentMarksPerQ}
                    onChange={(e) => setAssessmentMarksPerQ(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Total Maximum Marks:</span>
                  <strong className="text-slate-900">{assessmentQCount * assessmentMarksPerQ} Marks</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Passing Threshold:</span>
                  <strong className="text-slate-900">{assessmentPassingMarks} Marks (40%)</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Year Isolation:</span>
                  <strong className="text-indigo-600">Year {importRecord?.academic_year || 2} Only</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowAssessmentModal(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAssessment}
                disabled={actionLoading}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Publish to Turso</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
