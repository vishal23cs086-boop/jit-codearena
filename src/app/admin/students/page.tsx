'use client';

import React, { useEffect, useState } from 'react';
import { fetchStudents, saveStudent } from '@/lib/db';
import { StudentProfile } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Users,
  Search,
  Filter,
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  KeyRound,
  Trash2,
  X,
  Upload,
  UserCheck,
} from 'lucide-react';

const DEPARTMENTS = ['CSE', 'IT', 'AI&DS', 'ECE', 'MECH', 'CIVIL', 'EEE', 'CSBS'];
const YEARS = [1, 2, 3, 4];

export default function StudentManagementPage() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);

  // New Student Form
  const [newRegNo, setNewRegNo] = useState('');
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState('CSE');
  const [newYear, setNewYear] = useState(2);
  const [newSection, setNewSection] = useState('A');

  // CSV Import Raw Text
  const [csvText, setCsvText] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchStudents();
        setStudents(data);
      } catch (err) {
        console.warn('Error loading students:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredStudents = students.filter((s) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      s.register_number.toLowerCase().includes(term) ||
      s.full_name.toLowerCase().includes(term);
    const matchesDept = deptFilter === 'all' || s.department === deptFilter;
    const matchesYear = yearFilter === 'all' || s.year === Number(yearFilter);
    return matchesSearch && matchesDept && matchesYear;
  });

  const handleToggleStatus = async (student: StudentProfile) => {
    const nextStatus = student.status === 'active' ? 'disabled' : 'active';
    const updated = { ...student, status: nextStatus as StudentProfile['status'] };
    await saveStudent(updated);
    setStudents((prev) => prev.map((s) => (s.id === student.id ? updated : s)));
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRegNo = newRegNo.trim().toUpperCase();
    if (!cleanRegNo) return;

    const newStudent: StudentProfile = {
      id: `std-${Date.now()}`,
      email: `${cleanRegNo.toLowerCase()}@student.jit.edu`,
      full_name: newName.trim() || cleanRegNo,
      role: 'student',
      register_number: cleanRegNo,
      department: newDept,
      year: newYear,
      section: newSection,
      status: 'active',
      created_at: new Date().toISOString(),
    };

    await saveStudent(newStudent);
    setStudents((prev) => [newStudent, ...prev]);
    setShowAddModal(false);
    setNewRegNo('');
    setNewName('');
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;

    const lines = csvText.trim().split('\n');
    const imported: StudentProfile[] = [];

    for (const line of lines) {
      const parts = line.split(',').map((p) => p.trim());
      if (parts.length >= 2) {
        const regNo = parts[0].toUpperCase();
        const name = parts[1];
        const dept = parts[2] || 'CSE';
        const yr = Number(parts[3]) || 2;

        if (regNo && !regNo.toLowerCase().includes('register')) {
          const st: StudentProfile = {
            id: `std-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            email: `${regNo.toLowerCase()}@student.jit.edu`,
            full_name: name,
            role: 'student',
            register_number: regNo,
            department: dept,
            year: yr,
            section: 'A',
            status: 'active',
            created_at: new Date().toISOString(),
          };
          await saveStudent(st);
          imported.push(st);
        }
      }
    }

    setStudents((prev) => [...imported, ...prev]);
    setShowCsvModal(false);
    setCsvText('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Users className="w-7 h-7 text-indigo-600" />
            <span>Student Candidate Directory</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage registered candidates, department enrollments, and examination authorization status
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCsvModal(true)}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-semibold transition border border-slate-200 shadow-sm flex items-center gap-2"
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-sm shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/90 backdrop-blur-xl p-3 rounded-2xl border border-slate-200/90 shadow-sm shadow-slate-900/5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student name or register number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
          />
        </div>

        <div>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 focus:bg-white"
          >
            <option value="all">All Departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 focus:bg-white"
          >
            <option value="all">All Years</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table */}
      {filteredStudents.length > 0 ? (
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm shadow-slate-900/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-4 px-4">Register Number</th>
                  <th className="py-4 px-3">Name</th>
                  <th className="py-4 px-3">Department</th>
                  <th className="py-4 px-3 text-center">Year</th>
                  <th className="py-4 px-3 text-center">Status</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-4 font-mono font-bold text-indigo-600">
                      {st.register_number}
                    </td>
                    <td className="py-4 px-3 font-semibold text-slate-900">
                      {st.full_name}
                    </td>
                    <td className="py-4 px-3">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/60 text-slate-700 font-mono text-[11px]">
                        {st.department}
                      </span>
                    </td>
                    <td className="py-4 px-3 text-center text-slate-500">
                      Year {st.year}
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold ${
                          st.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${st.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {st.status === 'active' ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleToggleStatus(st)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-medium transition border ${
                          st.status === 'active'
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                        }`}
                      >
                        {st.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No students registered yet"
          description="Candidates who register via the student portal or accounts added manually by the exam cell will appear here."
          action={{
            label: "+ Add Candidate",
            onClick: () => setShowAddModal(true),
          }}
        />
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Add Candidate Account</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">Register Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 23CS105"
                  value={newRegNo}
                  onChange={(e) => setNewRegNo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-mono uppercase focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">Student Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. S. Vignesh"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1.5">Department</label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 focus:bg-white focus:outline-none focus:border-indigo-500"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1.5">Academic Year</label>
                  <select
                    value={newYear}
                    onChange={(e) => setNewYear(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 focus:bg-white focus:outline-none focus:border-indigo-500"
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        Year {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl transition border border-slate-200 shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-sm shadow-indigo-600/20 transition"
                >
                  Save Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Bulk Import Students from CSV</h3>
              <button onClick={() => setShowCsvModal(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCsvImport} className="mt-5 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Paste student records below in comma-separated format:
                <br />
                <code className="text-indigo-600 font-mono text-[11px] bg-indigo-50 border border-indigo-200/60 px-2 py-1 rounded inline-block mt-1.5 font-semibold">
                  RegisterNumber, FullName, Department, Year
                </code>
              </p>

              <textarea
                rows={6}
                required
                placeholder="23CS001, Aravind Kumar, CSE, 2&#10;23CS002, Bhavana R, CSE, 2&#10;22IT015, Dinesh S, IT, 3"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-mono text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
              />

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCsvModal(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl transition border border-slate-200 shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-sm shadow-emerald-600/20 transition"
                >
                  Import All Records
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
