'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Filter,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Archive,
  Lock,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  X,
  Check,
  Shield,
  Clock,
  ArrowUpDown,
  UserCheck,
  UserX,
  FileSpreadsheet,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { StudentProfileDrawer } from '@/components/admin/StudentProfileDrawer';

const DEPARTMENTS = ['CSE', 'IT', 'AI&DS', 'ECE', 'MECH', 'CIVIL', 'EEE', 'CSBS'];
const YEARS = [1, 2, 3, 4];
const SECTIONS = ['A', 'B', 'C', 'D'];

interface StudentItem {
  id: string;
  email: string;
  full_name: string;
  role: 'student';
  register_number: string;
  department: string;
  year: number;
  section: string;
  phone?: string;
  status: 'active' | 'disabled' | 'archived';
  is_archived: boolean;
  created_at: string;
  updated_at?: string;
  attempts_count: number;
  average_score: number | null;
  max_score: number | null;
  last_login: string | null;
}

export default function StudentManagementPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'register_number' | 'created_at' | 'last_login' | 'score'>('register_number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'disable' | 'enable' | 'archive' | null>(null);

  // Active Row Menu dropdown state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Modals & Drawers
  const [profileDrawerId, setProfileDrawerId] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);
  const [passwordStudent, setPasswordStudent] = useState<StudentItem | null>(null);
  const [deleteArchiveStudent, setDeleteArchiveStudent] = useState<StudentItem | null>(null);
  const [deleteHistoryInfo, setDeleteHistoryInfo] = useState<{ hasHistory: boolean; attemptsCount: number; submissionsCount: number } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Edit Form Fields
  const [editName, setEditName] = useState('');
  const [editRegNo, setEditRegNo] = useState('');
  const [editDept, setEditDept] = useState('CSE');
  const [editYear, setEditYear] = useState(2);
  const [editSection, setEditSection] = useState('A');

  // Reset Password Field
  const [newPassword, setNewPassword] = useState('');

  // Add Form Fields
  const [addName, setAddName] = useState('');
  const [addRegNo, setAddRegNo] = useState('');
  const [addDept, setAddDept] = useState('CSE');
  const [addYear, setAddYear] = useState(2);
  const [addSection, setAddSection] = useState('A');
  const [addPassword, setAddPassword] = useState('Student@123');

  // Notifications & Loaders
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStudentsList = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/students');
      const json = await res.json();
      if (json.success && Array.isArray(json.students)) {
        setStudents(json.students);
      }
    } catch (err) {
      console.warn('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentsList();
  }, []);

  // Close open dropdown menu on click outside
  useEffect(() => {
    const handleOutsideClick = () => setOpenMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Open Edit Modal
  const openEdit = (s: StudentItem) => {
    setEditingStudent(s);
    setEditName(s.full_name);
    setEditRegNo(s.register_number);
    setEditDept(s.department);
    setEditYear(s.year);
    setEditSection(s.section || 'A');
    setOpenMenuId(null);
  };

  // Submit Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    if (!editName.trim() || !editRegNo.trim()) {
      showToast('error', 'Name and Register Number are required.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: editName.trim(),
          register_number: editRegNo.trim().toUpperCase(),
          department: editDept,
          year: Number(editYear),
          section: editSection,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', '✓ Student details updated successfully.');
        setEditingStudent(null);
        fetchStudentsList();
      } else {
        showToast('error', data.error || 'Failed to update student details');
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Network error updating student');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Password Modal
  const openPasswordModal = (s: StudentItem) => {
    setPasswordStudent(s);
    setNewPassword('');
    setOpenMenuId(null);
  };

  // Submit Password Reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordStudent) return;
    if (newPassword.trim().length < 6) {
      showToast('error', 'Password must be at least 6 characters long.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/students/${passwordStudent.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPassword.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `✓ Password for ${passwordStudent.register_number} reset successfully.`);
        setPasswordStudent(null);
      } else {
        showToast('error', data.error || 'Password reset failed');
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Error executing password reset');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Single Student Status
  const handleToggleStatus = async (student: StudentItem, targetStatus: 'active' | 'disabled') => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/students/${student.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `✓ Student ${student.register_number} ${targetStatus === 'active' ? 'enabled' : 'disabled'}.`);
        fetchStudentsList();
      } else {
        showToast('error', data.error || 'Status update failed');
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Request error');
    } finally {
      setActionLoading(false);
      setOpenMenuId(null);
    }
  };

  // Open Delete / Archive Confirmation
  const openDeleteArchive = async (student: StudentItem) => {
    setDeleteArchiveStudent(student);
    setDeleteHistoryInfo(null);
    setOpenMenuId(null);

    // Fetch history info
    try {
      const res = await fetch(`/api/admin/students/${student.id}/history`);
      const data = await res.json();
      if (data.success) {
        setDeleteHistoryInfo({
          hasHistory: data.hasHistory,
          attemptsCount: data.attemptsCount,
          submissionsCount: data.submissionsCount,
        });
      }
    } catch {
      // safe fallback
    }
  };

  // Execute Delete / Archive
  const handleConfirmDeleteArchive = async () => {
    if (!deleteArchiveStudent) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/students/${deleteArchiveStudent.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          'success',
          data.action === 'archived'
            ? `✓ Student safely archived. Examination history preserved.`
            : `✓ Student permanently deleted.`
        );
        setDeleteArchiveStudent(null);
        fetchStudentsList();
      } else {
        showToast('error', data.error || 'Operation failed');
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Request failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Add Student
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRegNo = addRegNo.trim().toUpperCase();
    if (!cleanRegNo || !addName.trim()) {
      showToast('error', 'Name and Register Number are required.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: addName.trim(),
          registerNumber: cleanRegNo,
          department: addDept,
          year: Number(addYear),
          section: addSection,
          password: addPassword.trim() || 'Student@123',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `✓ Candidate ${cleanRegNo} successfully enrolled.`);
        setShowAddModal(false);
        setAddName('');
        setAddRegNo('');
        fetchStudentsList();
      } else {
        showToast('error', data.error || 'Failed to enroll student');
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Enrollment error');
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Bulk Action
  const handleConfirmBulkAction = async () => {
    if (!bulkAction || selectedIds.length === 0) return;
    try {
      setActionLoading(true);
      const res = await fetch('/api/admin/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: selectedIds,
          action: bulkAction,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `✓ Successfully updated ${data.result?.count || selectedIds.length} candidate accounts.`);
        setSelectedIds([]);
        setBulkAction(null);
        fetchStudentsList();
      } else {
        showToast('error', data.error || 'Bulk update failed');
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Bulk request failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle selection for all filtered students
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map((s) => s.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Filtered & Sorted Student List
  const filteredStudents = useMemo(() => {
    const list = students.filter((s) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        s.register_number.toLowerCase().includes(term) ||
        s.full_name.toLowerCase().includes(term);

      const matchesDept = deptFilter === 'all' || s.department === deptFilter;
      const matchesYear = yearFilter === 'all' || s.year === Number(yearFilter);
      const matchesSection = sectionFilter === 'all' || s.section === sectionFilter;

      let matchesStatus = true;
      if (statusFilter === 'active') matchesStatus = s.status === 'active';
      else if (statusFilter === 'disabled') matchesStatus = s.status === 'disabled';
      else if (statusFilter === 'archived') matchesStatus = s.status === 'archived' || s.is_archived;

      return matchesSearch && matchesDept && matchesYear && matchesSection && matchesStatus;
    });

    list.sort((a, b) => {
      let comp = 0;
      if (sortBy === 'name') comp = a.full_name.localeCompare(b.full_name);
      else if (sortBy === 'register_number') comp = a.register_number.localeCompare(b.register_number);
      else if (sortBy === 'created_at') comp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (sortBy === 'last_login') {
        const tA = a.last_login ? new Date(a.last_login).getTime() : 0;
        const tB = b.last_login ? new Date(b.last_login).getTime() : 0;
        comp = tA - tB;
      } else if (sortBy === 'score') {
        comp = (a.average_score || 0) - (b.average_score || 0);
      }
      return sortOrder === 'asc' ? comp : -comp;
    });

    return list;
  }, [students, searchTerm, deptFilter, yearFilter, sectionFilter, statusFilter, sortBy, sortOrder]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-semibold border backdrop-blur-md transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900 shadow-emerald-600/10'
              : 'bg-rose-50/95 border-rose-200 text-rose-900 shadow-rose-600/10'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-600 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-600">
              <Users className="w-4 h-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Candidate Directory</h1>
          </div>
          <p className="text-xs text-slate-500">
            Manage institutional student records, credentials, account standing, and examination permissions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchStudentsList}
            className="glass-button p-2.5 rounded-xl text-slate-600 hover:text-indigo-600 transition"
            title="Refresh student records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm shadow-indigo-600/20 flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name or register number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs">
            <span className="text-slate-400 font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="glass-input rounded-xl px-2.5 py-1.5 text-xs text-slate-700"
            >
              <option value="register_number">Register No</option>
              <option value="name">Name</option>
              <option value="created_at">Registration Date</option>
              <option value="last_login">Last Login</option>
              <option value="score">Average Score</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition"
              title="Toggle sort order"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/80 mr-2">
            {[
              { id: 'all', label: 'All' },
              { id: 'active', label: 'Active' },
              { id: 'disabled', label: 'Disabled' },
              { id: 'archived', label: 'Archived' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] uppercase tracking-wider transition ${
                  statusFilter === tab.id
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="glass-input rounded-xl px-2.5 py-1.5 text-xs text-slate-700"
          >
            <option value="all">All Departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Year Filter */}
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="glass-input rounded-xl px-2.5 py-1.5 text-xs text-slate-700"
          >
            <option value="all">All Years</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </select>

          {/* Section Filter */}
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="glass-input rounded-xl px-2.5 py-1.5 text-xs text-slate-700"
          >
            <option value="all">All Sections</option>
            {SECTIONS.map((sec) => (
              <option key={sec} value={sec}>
                Section {sec}
              </option>
            ))}
          </select>

          {(deptFilter !== 'all' || yearFilter !== 'all' || sectionFilter !== 'all' || statusFilter !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setDeptFilter('all');
                setYearFilter('all');
                setSectionFilter('all');
                setStatusFilter('all');
                setSearchTerm('');
              }}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span>{selectedIds.length} candidate{selectedIds.length > 1 ? 's' : ''} selected</span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <div className="flex items-center gap-2">
            <button
              onClick={() => setBulkAction('enable')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl transition flex items-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Enable Accounts</span>
            </button>

            <button
              onClick={() => setBulkAction('disable')}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 rounded-xl transition flex items-center gap-1.5"
            >
              <UserX className="w-3.5 h-3.5" />
              <span>Disable Accounts</span>
            </button>

            <button
              onClick={() => setBulkAction('archive')}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 rounded-xl transition flex items-center gap-1.5"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archive Accounts</span>
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="p-1 text-slate-400 hover:text-white ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Students Table */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
          <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Querying institutional student database from Turso...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs">
          <EmptyState
            title="No Students Registered"
            description={
              searchTerm || deptFilter !== 'all' || yearFilter !== 'all' || statusFilter !== 'all'
                ? 'No students found matching your filters. Try clearing some search criteria.'
                : 'Students will appear here after registration or manual administrator enrollment.'
            }
            action={{
              label: 'Add Student',
              onClick: () => setShowAddModal(true),
            }}
          />
        </div>
      ) : (
        <div className="glass-card rounded-3xl border border-slate-200 overflow-visible shadow-xs">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredStudents.length && filteredStudents.length > 0}
                      onChange={handleToggleSelectAll}
                      className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-3">Student</th>
                  <th className="py-3.5 px-3 font-mono">Register No</th>
                  <th className="py-3.5 px-3">Department & Year</th>
                  <th className="py-3.5 px-3 text-center">Attempts & Score</th>
                  <th className="py-3.5 px-3">Last Active</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => {
                  const isSelected = selectedIds.includes(s.id);
                  const isMenuOpen = openMenuId === s.id;

                  return (
                    <tr
                      key={s.id}
                      className={`hover:bg-slate-50/70 transition ${
                        isSelected ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      {/* Select Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(s.id)}
                          className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Student Info */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center font-bold text-indigo-700 text-xs shrink-0 shadow-2xs">
                            {s.full_name ? s.full_name.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div>
                            <span
                              onClick={() => setProfileDrawerId(s.id)}
                              className="font-bold text-slate-900 block hover:text-indigo-600 cursor-pointer"
                            >
                              {s.full_name}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate max-w-[180px]">
                              {s.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Register Number */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-800 text-xs">
                        {s.register_number}
                      </td>

                      {/* Department & Year */}
                      <td className="py-3 px-3 text-slate-600">
                        <span className="font-semibold text-slate-800">{s.department}</span>
                        <span className="text-slate-400"> • Year {s.year} (Sec {s.section || 'A'})</span>
                      </td>

                      {/* Attempts & Score */}
                      <td className="py-3 px-3 text-center">
                        {s.attempts_count > 0 ? (
                          <div className="space-y-0.5">
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {s.average_score !== null ? `${s.average_score}% Avg` : '—'}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {s.attempts_count} attempt{s.attempts_count > 1 ? 's' : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">0 Attempts</span>
                        )}
                      </td>

                      {/* Last Active */}
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                        {s.last_login ? new Date(s.last_login).toLocaleDateString() : 'Never'}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3 text-center">
                        {s.status === 'active' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[10px] uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            ACTIVE
                          </span>
                        )}
                        {s.status === 'disabled' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-bold text-[10px] uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            DISABLED
                          </span>
                        )}
                        {(s.status === 'archived' || s.is_archived) && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[10px] uppercase">
                            ARCHIVED
                          </span>
                        )}
                      </td>

                      {/* Actions Menu */}
                      <td className="py-3 px-4 text-right relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(isMenuOpen ? null : s.id);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          title="Actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Modern Dropdown Menu */}
                        {isMenuOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-4 top-10 z-50 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 text-left text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
                          >
                            {/* View Profile */}
                            <button
                              onClick={() => {
                                setProfileDrawerId(s.id);
                                setOpenMenuId(null);
                              }}
                              className="w-full px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2.5 transition text-xs"
                            >
                              <Eye className="w-3.5 h-3.5 text-indigo-600" />
                              <span>View Profile</span>
                            </button>

                            {/* Edit Student */}
                            <button
                              onClick={() => openEdit(s)}
                              className="w-full px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2.5 transition text-xs"
                            >
                              <Edit className="w-3.5 h-3.5 text-blue-600" />
                              <span>Edit Student</span>
                            </button>

                            {/* Reset Password */}
                            <button
                              onClick={() => openPasswordModal(s)}
                              className="w-full px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2.5 transition text-xs"
                            >
                              <Lock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Reset Password</span>
                            </button>

                            <div className="h-px bg-slate-100 my-1" />

                            {/* Disable / Enable Toggle */}
                            {s.status === 'active' ? (
                              <button
                                onClick={() => handleToggleStatus(s, 'disabled')}
                                className="w-full px-3.5 py-2 hover:bg-amber-50 text-amber-700 flex items-center gap-2.5 transition text-xs"
                              >
                                <UserX className="w-3.5 h-3.5 text-amber-600" />
                                <span>Disable Account</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleStatus(s, 'active')}
                                className="w-full px-3.5 py-2 hover:bg-emerald-50 text-emerald-700 flex items-center gap-2.5 transition text-xs"
                              >
                                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Enable Account</span>
                              </button>
                            )}

                            {/* Delete / Archive */}
                            <button
                              onClick={() => openDeleteArchive(s)}
                              className="w-full px-3.5 py-2 hover:bg-rose-50 text-rose-700 flex items-center gap-2.5 transition text-xs"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>Delete / Archive</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STUDENT PROFILE DRAWER */}
      <StudentProfileDrawer
        studentId={profileDrawerId}
        onClose={() => setProfileDrawerId(null)}
      />

      {/* EDIT STUDENT MODAL */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Edit Student Profile</h3>
                <p className="text-xs text-slate-500">Official academic credentials and cohort allocation</p>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Candidate Full Name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full glass-input rounded-xl p-2.5 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">College Register Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 23CS001"
                  value={editRegNo}
                  onChange={(e) => setEditRegNo(e.target.value)}
                  className="w-full glass-input rounded-xl p-2.5 font-mono uppercase text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Department</label>
                  <select
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
                    className="w-full glass-input rounded-xl p-2.5 text-xs text-slate-900"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Enrolled Year</label>
                  <select
                    value={editYear}
                    onChange={(e) => setEditYear(Number(e.target.value))}
                    className="w-full glass-input rounded-xl p-2.5 text-xs text-slate-900"
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        Year {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Section</label>
                <select
                  value={editSection}
                  onChange={(e) => setEditSection(e.target.value)}
                  className="w-full glass-input rounded-xl p-2.5 text-xs text-slate-900"
                >
                  {SECTIONS.map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {passwordStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Reset Candidate Password</h3>
                <p className="text-xs text-slate-500">
                  {passwordStudent.full_name} • {passwordStudent.register_number}
                </p>
              </div>
              <button
                onClick={() => setPasswordStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2">
                <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  For institutional security, the student&apos;s previous password is never displayed. Enter a new
                  temporary password below.
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">New Password *</label>
                <input
                  type="text"
                  required
                  placeholder="Min 6 characters (e.g. Student@2025)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full glass-input rounded-xl p-2.5 font-mono text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordStudent(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? 'Updating...' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE / ARCHIVE CONFIRMATION MODAL */}
      {deleteArchiveStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
              deleteHistoryInfo?.hasHistory
                ? 'bg-amber-50 border border-amber-200 text-amber-600'
                : 'bg-rose-50 border border-rose-200 text-rose-600'
            }`}>
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                {deleteHistoryInfo?.hasHistory ? 'Archive Student?' : 'Delete Student?'}
              </h3>
              <div className="text-xs text-slate-600 font-medium">
                <span>{deleteArchiveStudent.full_name}</span> • <span className="font-mono">{deleteArchiveStudent.register_number}</span>
              </div>
            </div>

            {deleteHistoryInfo?.hasHistory ? (
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
                <p className="font-semibold text-amber-950">This student has examination history.</p>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Found {deleteHistoryInfo.attemptsCount} assessment attempt records. The account will be disabled, but
                  all historical examination scores, rankings, and audit logs will be permanently preserved.
                </p>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">This student has no examination history.</p>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  There are no test attempts or submissions tied to this account. This record will be permanently deleted
                  from Turso. This action cannot be undone.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteArchiveStudent(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmDeleteArchive}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition ${
                  deleteHistoryInfo?.hasHistory
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {actionLoading
                  ? 'Processing...'
                  : deleteHistoryInfo?.hasHistory
                  ? 'Archive Student'
                  : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK ACTION CONFIRMATION MODAL */}
      {bulkAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 mx-auto">
              <Users className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                {bulkAction === 'disable' && `Disable ${selectedIds.length} students?`}
                {bulkAction === 'enable' && `Enable ${selectedIds.length} students?`}
                {bulkAction === 'archive' && `Archive ${selectedIds.length} students?`}
              </h3>
              <p className="text-xs text-slate-500">
                {bulkAction === 'disable' &&
                  'Disabled students will no longer be permitted to log in or start assessments until re-enabled.'}
                {bulkAction === 'enable' &&
                  'Selected candidate accounts will be restored to active institutional standing.'}
                {bulkAction === 'archive' &&
                  'Archived students will be deactivated while preserving all past examination and submission history.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setBulkAction(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmBulkAction}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
              >
                {actionLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD STUDENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Enroll New Candidate</h3>
                <p className="text-xs text-slate-500">Register individual student credentials</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arun Kumar"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full glass-input rounded-xl p-2.5 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">College Register Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 23CS001"
                  value={addRegNo}
                  onChange={(e) => setAddRegNo(e.target.value)}
                  className="w-full glass-input rounded-xl p-2.5 font-mono uppercase text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Department</label>
                  <select
                    value={addDept}
                    onChange={(e) => setAddDept(e.target.value)}
                    className="w-full glass-input rounded-xl p-2.5 text-xs text-slate-900"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Year</label>
                  <select
                    value={addYear}
                    onChange={(e) => setAddYear(Number(e.target.value))}
                    className="w-full glass-input rounded-xl p-2.5 text-xs text-slate-900"
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        Year {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Section</label>
                <select
                  value={addSection}
                  onChange={(e) => setAddSection(e.target.value)}
                  className="w-full glass-input rounded-xl p-2.5 text-xs text-slate-900"
                >
                  {SECTIONS.map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Initial Password</label>
                <input
                  type="text"
                  placeholder="Student@123"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  className="w-full glass-input rounded-xl p-2.5 font-mono text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? 'Enrolling...' : 'Enroll Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
