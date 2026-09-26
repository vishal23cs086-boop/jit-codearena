'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
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
  Copy,
  Edit,
  Trash2,
  Archive,
  AlertTriangle,
  Search,
  Filter,
  Check,
  RefreshCw,
  Eye,
  Info,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

interface QuestionDraft {
  id?: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  initial_code?: string;
  solution_code?: string;
  test_cases: Array<{
    input: string;
    expected_output: string;
    is_hidden: boolean;
  }>;
}

interface AssessmentItem {
  id: string;
  title: string;
  description: string;
  code: string;
  instructions: string;
  duration: number;
  total_marks: number;
  passing_marks: number;
  start_time: string;
  end_time: string;
  status: 'draft' | 'scheduled' | 'live' | 'completed' | 'closed' | 'archived';
  year: number; // 2 or 3
  question_count: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  participant_count: number;
  questions?: QuestionDraft[];
}

export default function AssessmentManagementPage() {
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [poolStats, setPoolStats] = useState<{ year2Count: number; year3Count: number }>({
    year2Count: 0,
    year3Count: 0,
  });

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<AssessmentItem | null>(null);
  const [deletingAssessment, setDeletingAssessment] = useState<AssessmentItem | null>(null);
  const [viewingAssessment, setViewingAssessment] = useState<AssessmentItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create / Edit Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formInstructions, setFormInstructions] = useState('Ensure full screen is maintained. Avoid switching tabs.');
  const [formDuration, setFormDuration] = useState(60);
  const [formTotalMarks, setFormTotalMarks] = useState(100);
  const [formPassingMarks, setFormPassingMarks] = useState(40);
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formYear, setFormYear] = useState<2 | 3>(2);
  const [formQuestionCount, setFormQuestionCount] = useState<number>(0);
  const [formQuestions, setFormQuestions] = useState<QuestionDraft[]>([]);

  // New question mini-form state
  const [newQTitle, setNewQTitle] = useState('');
  const [newQDesc, setNewQDesc] = useState('');
  const [newQDiff, setNewQDiff] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [newQMarks, setNewQMarks] = useState(25);
  const [newQInitialCode, setNewQInitialCode] = useState('def solution():\n    # Write your code here\n    pass\n');
  const [newQInput, setNewQInput] = useState('');
  const [newQOutput, setNewQOutput] = useState('');
  const [showAddQuestion, setShowAddQuestion] = useState(false);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const [resAss, resStats] = await Promise.all([
        fetch('/api/admin/assessments?includeArchived=true'),
        fetch('/api/admin/questions?stats=true'),
      ]);
      const dataAss = await resAss.json();
      if (dataAss.success && Array.isArray(dataAss.assessments)) {
        setAssessments(dataAss.assessments);
      }
      const dataStats = await resStats.json();
      if (dataStats.success && dataStats.stats) {
        setPoolStats({
          year2Count: dataStats.stats.year2Count || 0,
          year3Count: dataStats.stats.year3Count || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load assessments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  const openCreateModal = () => {
    setEditingAssessment(null);
    setFormTitle('');
    setFormCode(`JIT-Y2-PY-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormDescription('');
    setFormInstructions('Ensure full screen is maintained. Avoid switching tabs or accessing unauthorized windows.');
    setFormDuration(60);
    setFormTotalMarks(100);
    setFormPassingMarks(40);
    setFormYear(2);
    setFormQuestionCount(poolStats.year2Count || 4);
    const now = new Date();
    setFormStartTime(now.toISOString().slice(0, 16));
    const nextWeek = new Date(Date.now() + 7 * 86400000);
    setFormEndTime(nextWeek.toISOString().slice(0, 16));
    setFormQuestions([]);
    setShowCreateModal(true);
  };

  const openEditModal = async (test: AssessmentItem) => {
    setEditingAssessment(test);
    setFormTitle(test.title);
    setFormCode(test.code || `TEST-${test.id.slice(-4)}`);
    setFormDescription(test.description || '');
    setFormInstructions(test.instructions || '');
    setFormDuration(test.duration || 60);
    setFormTotalMarks(test.total_marks || 100);
    setFormPassingMarks(test.passing_marks || 40);
    setFormStartTime(test.start_time ? test.start_time.slice(0, 16) : '');
    setFormEndTime(test.end_time ? test.end_time.slice(0, 16) : '');
    setFormYear(Number(test.year) === 3 ? 3 : 2);
    setFormQuestionCount(Number(test.question_count || 0));

    // Fetch full question list for this test
    try {
      const res = await fetch(`/api/admin/assessments/${test.id}`);
      const data = await res.json();
      if (data.success && data.assessment?.questions) {
        setFormQuestions(data.assessment.questions);
      } else {
        setFormQuestions([]);
      }
    } catch {
      setFormQuestions([]);
    }
    setShowCreateModal(true);
  };

  const handleAddQuestionToForm = () => {
    if (!newQTitle.trim()) return;
    const q: QuestionDraft = {
      title: newQTitle.trim(),
      description: newQDesc.trim(),
      difficulty: newQDiff,
      marks: Number(newQMarks) || 20,
      initial_code: newQInitialCode,
      test_cases: [
        {
          input: newQInput.trim() || '5',
          expected_output: newQOutput.trim() || '10',
          is_hidden: false,
        },
      ],
    };
    setFormQuestions((prev) => [...prev, q]);
    setNewQTitle('');
    setNewQDesc('');
    setNewQInput('');
    setNewQOutput('');
    setShowAddQuestion(false);
  };

  const handleSaveAssessment = async (targetStatus: 'draft' | 'live' | 'scheduled') => {
    const trimmedTitle = formTitle.trim();
    if (!trimmedTitle) {
      alert('Assessment title is required.');
      return;
    }
    const trimmedCode = formCode.trim();
    if (!trimmedCode) {
      alert('Assessment code is required.');
      return;
    }
    if (Number(formDuration) <= 0) {
      alert('Duration must be greater than 0 minutes.');
      return;
    }
    if (Number(formTotalMarks) <= 0) {
      alert('Total marks must be greater than 0.');
      return;
    }
    if (Number(formPassingMarks) < 0) {
      alert('Passing marks cannot be negative.');
      return;
    }
    if (Number(formPassingMarks) > Number(formTotalMarks)) {
      alert('Passing marks cannot exceed total marks.');
      return;
    }
    if (formStartTime && formEndTime && new Date(formStartTime).getTime() >= new Date(formEndTime).getTime()) {
      alert('End time must be after start time.');
      return;
    }

    const currentPool = formYear === 2 ? poolStats.year2Count : poolStats.year3Count;
    if (formQuestions.length === 0 && Number(formQuestionCount) > currentPool) {
      alert(`Only ${currentPool} questions are available in the Year ${formYear} question bank.`);
      return;
    }

    setActionLoading(true);

    try {
      const payload = {
        title: trimmedTitle,
        code: trimmedCode,
        description: formDescription.trim(),
        instructions: formInstructions.trim(),
        duration: Number(formDuration),
        total_marks: Number(formTotalMarks),
        passing_marks: Number(formPassingMarks),
        start_time: formStartTime || new Date().toISOString(),
        end_time: formEndTime || new Date(Date.now() + 86400000 * 7).toISOString(),
        status: targetStatus,
        year: Number(formYear),
        question_count: Number(formQuestionCount),
        questions: formQuestions,
      };

      if (editingAssessment) {
        const res = await fetch(`/api/admin/assessments/${editingAssessment.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          setActionMessage({ type: 'success', text: 'Assessment updated successfully!' });
          setShowCreateModal(false);
          fetchAssessments();
        } else {
          alert(data.error || 'Failed to update assessment');
        }
      } else {
        const res = await fetch('/api/admin/assessments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          setActionMessage({
            type: 'success',
            text: targetStatus === 'live' ? 'Assessment created & published LIVE!' : 'Assessment saved as Draft!',
          });
          setShowCreateModal(false);
          fetchAssessments();
        } else {
          alert(data.error || 'Failed to create assessment');
        }
      }
    } catch (err: any) {
      alert(err?.message || 'Error saving assessment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicate = async (test: AssessmentItem) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/assessments/${test.id}/duplicate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage({ type: 'success', text: `Cloned "${test.title}" as Draft.` });
        fetchAssessments();
      } else {
        alert(data.error || 'Duplicate failed');
      }
    } catch (err: any) {
      alert(err?.message || 'Duplicate request failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusToggle = async (test: AssessmentItem, newStatus: string) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/assessments/${test.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage({ type: 'success', text: `Assessment status changed to ${newStatus.toUpperCase()}` });
        fetchAssessments();
      } else {
        alert(data.error || 'Status update failed');
      }
    } catch (err: any) {
      alert(err?.message || 'Request failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingAssessment) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/assessments/${deletingAssessment.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage({
          type: 'success',
          text: data.action === 'archived' ? 'Assessment safely archived (historical student attempts preserved).' : 'Assessment deleted permanently.',
        });
        setDeletingAssessment(null);
        fetchAssessments();
      } else {
        alert(data.error || 'Delete failed');
      }
    } catch (err: any) {
      alert(err?.message || 'Delete request failed');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredAssessments = useMemo(() => {
    return assessments.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.code && t.code.toLowerCase().includes(searchQuery.toLowerCase()));

      if (statusFilter === 'all') return matchesSearch;
      if (statusFilter === 'archived') return matchesSearch && t.is_archived;
      if (t.is_archived && statusFilter !== 'archived') return false;
      return matchesSearch && t.status.toLowerCase() === statusFilter.toLowerCase();
    });
  }, [assessments, searchQuery, statusFilter]);

  const liveCalculatedMarks = formQuestions.reduce((acc, q) => acc + (Number(q.marks) || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Action banner feedback */}
      {actionMessage && (
        <div className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold ${
          actionMessage.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-600">
              <Layers className="w-4 h-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Assessment Management</h1>
          </div>
          <p className="text-xs text-slate-500">
            Create, schedule, edit, monitor, and safely archive institutional programming evaluations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchAssessments}
            className="glass-button p-2.5 rounded-xl text-slate-600 hover:text-indigo-600 transition"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm shadow-indigo-600/20 flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Assessment</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 text-xs">
          {[
            { id: 'all', label: 'All' },
            { id: 'live', label: 'Live' },
            { id: 'scheduled', label: 'Scheduled' },
            { id: 'draft', label: 'Drafts' },
            { id: 'closed', label: 'Closed' },
            { id: 'archived', label: 'Archived' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-medium transition ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ASSESSMENTS TABLE */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading institutional assessment database...</p>
        </div>
      ) : filteredAssessments.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs">
          <EmptyState
            title="No Assessments Found"
            description={
              searchQuery
                ? `No assessments match "${searchQuery}". Clear your search or change the filter tab.`
                : 'No institutional assessments have been created yet. Create your first assessment to begin.'
            }
            action={{
              label: 'Create Assessment',
              onClick: openCreateModal,
            }}
          />
        </div>
      ) : (
        <div className="glass-card rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Assessment</th>
                  <th className="py-3 px-3 text-center">Questions</th>
                  <th className="py-3 px-3 text-center">Duration</th>
                  <th className="py-3 px-3 text-center">Participants</th>
                  <th className="py-3 px-3">Start Window</th>
                  <th className="py-3 px-3">End Window</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3">Updated</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssessments.map((test) => {
                  const isLive = test.status === 'live';
                  const isScheduled = test.status === 'scheduled';
                  const isDraft = test.status === 'draft';
                  const isClosed = test.status === 'closed';
                  const isArchived = test.is_archived || test.status === 'archived';

                  return (
                    <tr key={test.id} className="hover:bg-slate-50/70 transition">
                      {/* Title & Code */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer text-sm" onClick={() => openEditModal(test)}>
                              {test.title}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                                Number(test.year) === 3
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {Number(test.year) === 3 ? '3rd Year Assessment' : '2nd Year Assessment'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 font-mono text-[10px] rounded border border-slate-200">
                              {test.code || test.id.slice(0, 8)}
                            </span>
                            <span className="text-[11px] text-slate-400">• {test.total_marks || 100} Marks</span>
                          </div>
                        </div>
                      </td>

                      {/* Questions count */}
                      <td className="py-3.5 px-3 text-center font-medium text-slate-700">
                        <span className="font-bold text-slate-900">{test.question_count}</span>
                        <span className="text-[10px] text-slate-400 block font-normal">to assign</span>
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-3 text-center font-mono text-slate-600">
                        {test.duration}m
                      </td>

                      {/* Participants */}
                      <td className="py-3.5 px-3 text-center font-medium text-slate-700">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]">
                          <Users className="w-3 h-3 text-slate-500" />
                          <span>{test.participant_count}</span>
                        </span>
                      </td>

                      {/* Start Date */}
                      <td className="py-3.5 px-3 text-slate-500 font-mono text-[11px]">
                        {test.start_time ? new Date(test.start_time).toLocaleDateString() : 'Immediate'}
                      </td>

                      {/* End Date */}
                      <td className="py-3.5 px-3 text-slate-500 font-mono text-[11px]">
                        {test.end_time ? new Date(test.end_time).toLocaleDateString() : 'Continuous'}
                      </td>

                      {/* Dynamic Status Badge */}
                      <td className="py-3.5 px-3 text-center">
                        {isLive && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[10px] uppercase tracking-wide">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            LIVE
                          </span>
                        )}
                        {isScheduled && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-bold text-[10px] uppercase">
                            SCHEDULED
                          </span>
                        )}
                        {isDraft && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-bold text-[10px] uppercase">
                            DRAFT
                          </span>
                        )}
                        {isClosed && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-bold text-[10px] uppercase">
                            CLOSED
                          </span>
                        )}
                        {isArchived && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[10px] uppercase">
                            ARCHIVED
                          </span>
                        )}
                      </td>

                      {/* Updated Date */}
                      <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">
                        {test.updated_at ? new Date(test.updated_at).toLocaleDateString() : 'Recently'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* View Details */}
                          <button
                            onClick={() => setViewingAssessment(test)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                            title="View Assessment Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Live Toggle */}
                          {isLive ? (
                            <button
                              onClick={() => handleStatusToggle(test, 'closed')}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-semibold transition"
                              title="Close Assessment"
                            >
                              Close
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStatusToggle(test, 'live')}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-semibold transition"
                              title="Publish Live"
                            >
                              Publish
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            onClick={() => openEditModal(test)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                            title="Edit Assessment"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Duplicate */}
                          <button
                            onClick={() => handleDuplicate(test)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                            title="Duplicate as Draft"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Safe Delete / Archive */}
                          <button
                            onClick={() => setDeletingAssessment(test)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete or Archive Assessment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ASSESSMENT DETAILS VIEW MODAL */}
      {viewingAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-600 font-bold">
                  Assessment Details Record
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">{viewingAssessment.title}</h2>
              </div>
              <button
                onClick={() => setViewingAssessment(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Assessment Code</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{viewingAssessment.code || viewingAssessment.id}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Academic Year</span>
                <span className="font-bold text-indigo-700">{viewingAssessment.year === 2 ? '2nd Year Assessment' : '3rd Year Assessment'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Status</span>
                <span className="font-bold uppercase text-emerald-700">{viewingAssessment.status}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Available in Question Bank</span>
                <span className="font-bold text-indigo-600">
                  {viewingAssessment.year === 2 ? poolStats.year2Count : poolStats.year3Count} questions
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Questions Assigned</span>
                <span className="font-mono font-bold text-slate-900">{viewingAssessment.question_count} questions</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Duration</span>
                <span className="font-mono font-bold text-slate-900">{viewingAssessment.duration} Minutes</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Total Marks Target</span>
                <span className="font-mono font-bold text-slate-900">{viewingAssessment.total_marks} Marks</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Passing Marks</span>
                <span className="font-mono font-bold text-emerald-700">{viewingAssessment.passing_marks} Marks</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Candidate Attempts</span>
                <span className="font-mono font-bold text-slate-900">{viewingAssessment.participant_count} candidates</span>
              </div>
              <div className="col-span-2 sm:col-span-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Assessment Window</span>
                <span className="font-mono text-slate-700">
                  {viewingAssessment.start_time ? new Date(viewingAssessment.start_time).toLocaleString() : 'Immediate'} —{' '}
                  {viewingAssessment.end_time ? new Date(viewingAssessment.end_time).toLocaleString() : 'Continuous'}
                </span>
              </div>
              {viewingAssessment.description && (
                <div className="col-span-2 sm:col-span-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Description</span>
                  <p className="text-slate-700 text-xs leading-relaxed">{viewingAssessment.description}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingAssessment(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = viewingAssessment;
                  setViewingAssessment(null);
                  openEditModal(target);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Assessment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingAssessment ? 'Edit Assessment' : 'Create New Assessment'}
                </h2>
                <p className="text-xs text-slate-500">
                  {editingAssessment
                    ? `Configuring ${editingAssessment.title} • ID: ${editingAssessment.id}`
                    : 'Configure evaluation parameters, instructions, and questions.'}
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Warning if editing a Live test or test with attempts */}
            {editingAssessment && (editingAssessment.status === 'live' || editingAssessment.participant_count > 0) && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-950">Active Assessment Safeguard Warning</h4>
                  <p className="mt-0.5 text-amber-800">
                    This assessment is currently <strong>{editingAssessment.status.toUpperCase()}</strong> with{' '}
                    <strong>{editingAssessment.participant_count} student participant attempts</strong>. Changes made to
                    marks, duration, or test questions will affect live candidates. Exercise extreme caution.
                  </p>
                </div>
              </div>
            )}

            {/* LIVE SUMMARY PREVIEW BAR */}
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-semibold text-indigo-900">
                <Info className="w-4 h-4 text-indigo-600" />
                <span>Summary Preview:</span>
              </div>
              <div className="flex items-center gap-3 font-mono font-bold text-indigo-950 text-xs">
                <span>{formQuestions.length} Questions</span>
                <span>•</span>
                <span>{formDuration} Minutes</span>
                <span>•</span>
                <span>{liveCalculatedMarks} Total Marks</span>
              </div>
            </div>

            {/* FORM FIELDS */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1">Assessment Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Python Data Structures Midterm 2026"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full glass-input rounded-xl p-2.5 text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Assessment Code</label>
                  <input
                    type="text"
                    placeholder="e.g. PY-2026-01"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full glass-input rounded-xl p-2.5 font-mono uppercase text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Overview of topics tested, concepts covered..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full glass-input rounded-xl p-2.5 text-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <label className="block text-slate-800 font-bold mb-1">
                    Academic Year Restriction <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formYear}
                    onChange={(e) => setFormYear(Number(e.target.value) as 2 | 3)}
                    className="w-full bg-white border border-indigo-200 rounded-xl p-2.5 font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value={2}>2nd Year Assessment (Strict Year 2 Pool)</option>
                    <option value={3}>3rd Year Assessment (Strict Year 3 Pool)</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Available in {formYear === 2 ? '2nd Year' : '3rd Year'} Question Bank:{' '}
                    <strong className="text-indigo-600 font-bold">
                      {formYear === 2 ? poolStats.year2Count : poolStats.year3Count} questions
                    </strong>
                  </p>
                </div>

                <div>
                  <label className="block text-slate-800 font-bold mb-1">
                    Number of Questions to Assign (Server-side Randomized)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={formYear === 2 ? poolStats.year2Count : poolStats.year3Count}
                    placeholder="Enter question count"
                    value={formQuestionCount}
                    onChange={(e) => setFormQuestionCount(Number(e.target.value))}
                    className={`w-full bg-white border rounded-xl p-2.5 font-mono text-slate-900 focus:outline-none ${
                      formQuestionCount > (formYear === 2 ? poolStats.year2Count : poolStats.year3Count)
                        ? 'border-rose-400 bg-rose-50/40 text-rose-900'
                        : 'border-slate-200 focus:border-indigo-500'
                    }`}
                  />
                  {formQuestionCount > (formYear === 2 ? poolStats.year2Count : poolStats.year3Count) ? (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1">
                      Only {formYear === 2 ? poolStats.year2Count : poolStats.year3Count} questions are available in the Year {formYear} question bank.
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Each candidate receives {formQuestionCount} randomly selected questions from the Year {formYear} pool.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    min={5}
                    max={360}
                    value={formDuration}
                    onChange={(e) => setFormDuration(Number(e.target.value))}
                    className="w-full glass-input rounded-xl p-2.5 font-mono text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Total Marks Target</label>
                  <input
                    type="number"
                    min={10}
                    value={formTotalMarks}
                    onChange={(e) => setFormTotalMarks(Number(e.target.value))}
                    className="w-full glass-input rounded-xl p-2.5 font-mono text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Passing Marks</label>
                  <input
                    type="number"
                    min={0}
                    value={formPassingMarks}
                    onChange={(e) => setFormPassingMarks(Number(e.target.value))}
                    className="w-full glass-input rounded-xl p-2.5 font-mono text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Start Window</label>
                  <input
                    type="datetime-local"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full glass-input rounded-xl p-2.5 text-slate-900 font-mono text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">End Window</label>
                  <input
                    type="datetime-local"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full glass-input rounded-xl p-2.5 text-slate-900 font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* QUESTIONS BUILDER SECTION */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Questions ({formQuestions.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddQuestion(!showAddQuestion)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showAddQuestion ? 'Cancel' : 'Add Question'}</span>
                  </button>
                </div>

                {/* Sub-form to add question */}
                {showAddQuestion && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <h4 className="font-bold text-slate-800 text-xs">New Coding Question</h4>
                    <div>
                      <input
                        type="text"
                        placeholder="Question Title (e.g. Reverse Linked List)"
                        value={newQTitle}
                        onChange={(e) => setNewQTitle(e.target.value)}
                        className="w-full glass-input rounded-xl p-2 text-xs"
                      />
                    </div>
                    <div>
                      <textarea
                        rows={2}
                        placeholder="Problem description and specifications..."
                        value={newQDesc}
                        onChange={(e) => setNewQDesc(e.target.value)}
                        className="w-full glass-input rounded-xl p-2 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 text-[11px] mb-1">Difficulty</label>
                        <select
                          value={newQDiff}
                          onChange={(e: any) => setNewQDiff(e.target.value)}
                          className="w-full glass-input rounded-xl p-2 text-xs"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-600 text-[11px] mb-1">Marks</label>
                        <input
                          type="number"
                          value={newQMarks}
                          onChange={(e) => setNewQMarks(Number(e.target.value))}
                          className="w-full glass-input rounded-xl p-2 text-xs font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 text-[11px] mb-1">Sample Input</label>
                        <input
                          type="text"
                          placeholder="e.g. [1, 2, 3]"
                          value={newQInput}
                          onChange={(e) => setNewQInput(e.target.value)}
                          className="w-full glass-input rounded-xl p-2 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 text-[11px] mb-1">Expected Output</label>
                        <input
                          type="text"
                          placeholder="e.g. [3, 2, 1]"
                          value={newQOutput}
                          onChange={(e) => setNewQOutput(e.target.value)}
                          className="w-full glass-input rounded-xl p-2 text-xs font-mono"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddQuestionToForm}
                      className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs"
                    >
                      Save Question
                    </button>
                  </div>
                )}

                {/* List of current questions in draft */}
                <div className="space-y-2">
                  {formQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            Q{idx + 1}. {q.title}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] uppercase">
                            {q.difficulty}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{q.description}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-700">{q.marks} pts</span>
                        <button
                          type="button"
                          onClick={() => setFormQuestions((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* MODAL FOOTER BUTTONS */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleSaveAssessment('draft')}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
              >
                {actionLoading ? 'Saving...' : 'Save as Draft'}
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleSaveAssessment('live')}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/25 transition"
              >
                {actionLoading ? 'Publishing...' : 'Publish Assessment LIVE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAFE DELETE / ARCHIVE CONFIRMATION MODAL */}
      {deletingAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                {deletingAssessment.participant_count > 0 ? 'Safely Archive Assessment?' : 'Delete Assessment?'}
              </h3>
              <p className="text-xs text-slate-500">
                {deletingAssessment.participant_count > 0
                  ? `Assessment "${deletingAssessment.title}" has ${deletingAssessment.participant_count} student participant attempts. To protect academic records, it will be safely archived rather than permanently destroyed.`
                  : `Are you sure you want to permanently delete "${deletingAssessment.title}"? There are no candidate submissions associated with it.`}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Total Questions:</span>
                <span className="font-bold">{deletingAssessment.question_count}</span>
              </div>
              <div className="flex justify-between">
                <span>Participants:</span>
                <span className="font-bold">{deletingAssessment.participant_count}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-bold uppercase">{deletingAssessment.status}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingAssessment(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
              >
                {actionLoading
                  ? 'Processing...'
                  : deletingAssessment.participant_count > 0
                  ? 'Safely Archive'
                  : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
