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
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            <span>Student Candidate Directory</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage registered candidates, department enrollments, and examination authorization status
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCsvModal(true)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-700 flex items-center gap-2"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-lg shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student name or register number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
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
            className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
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
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4">Register Number</th>
                  <th className="py-3.5 px-3">Name</th>
                  <th className="py-3.5 px-3">Department</th>
                  <th className="py-3.5 px-3 text-center">Year</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {st.register_number}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-200">
                      {st.full_name}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {st.department}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-400">
                      Year {st.year}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          st.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {st.status === 'active' ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleToggleStatus(st)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-medium transition border ${
                          st.status === 'active'
                            ? 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border-emerald-500/30'
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
          title="No students registered yet."
          description="Candidates who register via the student portal or accounts added manually by the exam cell will appear here."
          action={{
            label: "+ Add Candidate",
            onClick: () => setShowAddModal(true),
          }}
        />
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Add Candidate Account</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Register Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 23CS105"
                  value={newRegNo}
                  onChange={(e) => setNewRegNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono uppercase"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Student Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. S. Vignesh"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Department</label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Academic Year</label>
                  <select
                    value={newYear}
                    onChange={(e) => setNewYear(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        Year {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl"
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Bulk Import Students from CSV</h3>
              <button onClick={() => setShowCsvModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCsvImport} className="mt-4 space-y-3.5 text-xs">
              <p className="text-slate-400 leading-relaxed">
                Paste student records below in comma-separated format:
                <br />
                <code className="text-indigo-400 font-mono text-[11px]">
                  RegisterNumber, FullName, Department, Year
                </code>
              </p>

              <textarea
                rows={6}
                required
                placeholder="23CS001, Aravind Kumar, CSE, 2&#10;23CS002, Bhavana R, CSE, 2&#10;22IT015, Dinesh S, IT, 3"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              />

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCsvModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl"
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
