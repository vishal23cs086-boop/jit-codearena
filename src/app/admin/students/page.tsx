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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Users className="w-7 h-7 text-indigo-400" />
            <span>Student Candidate Directory</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage registered candidates, department enrollments, and examination authorization status
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCsvModal(true)}
            className="px-4 py-2.5 glass-card-hover text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition border border-white/10 flex items-center gap-2"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 glass-card p-3 rounded-2xl border border-white/10">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student name or register number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.08]"
          />
        </div>

        <div>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/10 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500/50 focus:bg-[#0B1020]"
          >
            <option value="all" className="bg-[#0B1020] text-white">All Departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d} className="bg-[#0B1020] text-white">
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/10 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500/50 focus:bg-[#0B1020]"
          >
            <option value="all" className="bg-[#0B1020] text-white">All Years</option>
            {YEARS.map((y) => (
              <option key={y} value={y} className="bg-[#0B1020] text-white">
                Year {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table */}
      {filteredStudents.length > 0 ? (
        <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-4 px-4">Register Number</th>
                  <th className="py-4 px-3">Name</th>
                  <th className="py-4 px-3">Department</th>
                  <th className="py-4 px-3 text-center">Year</th>
                  <th className="py-4 px-3 text-center">Status</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-white/[0.03] transition">
                    <td className="py-4 px-4 font-mono font-bold text-indigo-400">
                      {st.register_number}
                    </td>
                    <td className="py-4 px-3 font-semibold text-white">
                      {st.full_name}
                    </td>
                    <td className="py-4 px-3">
                      <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-slate-300 font-mono text-[11px]">
                        {st.department}
                      </span>
                    </td>
                    <td className="py-4 px-3 text-center text-slate-400">
                      Year {st.year}
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold ${
                          st.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${st.status === 'active' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        {st.status === 'active' ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleToggleStatus(st)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-medium transition border ${
                          st.status === 'active'
                            ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30'
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card border border-white/10 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="font-bold text-white text-base">Add Candidate Account</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">Register Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 23CS105"
                  value={newRegNo}
                  onChange={(e) => setNewRegNo(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-3 text-white font-mono uppercase focus:bg-white/[0.08] focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">Student Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. S. Vignesh"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-3 text-white focus:bg-white/[0.08] focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1.5">Department</label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-3 text-slate-200 focus:bg-[#0B1020] focus:outline-none focus:border-indigo-500/50"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d} className="bg-[#0B1020] text-white">
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1.5">Academic Year</label>
                  <select
                    value={newYear}
                    onChange={(e) => setNewYear(Number(e.target.value))}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-3 text-slate-200 focus:bg-[#0B1020] focus:outline-none focus:border-indigo-500/50"
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y} className="bg-[#0B1020] text-white">
                        Year {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 glass-card-hover text-slate-400 hover:text-white rounded-xl transition border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card border border-white/10 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="font-bold text-white text-base">Bulk Import Students from CSV</h3>
              <button onClick={() => setShowCsvModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCsvImport} className="mt-5 space-y-4 text-xs">
              <p className="text-slate-300 leading-relaxed">
                Paste student records below in comma-separated format:
                <br />
                <code className="text-indigo-400 font-mono text-[11px] bg-white/[0.04] border border-white/10 px-2 py-1 rounded inline-block mt-1.5">
                  RegisterNumber, FullName, Department, Year
                </code>
              </p>

              <textarea
                rows={6}
                required
                placeholder="23CS001, Aravind Kumar, CSE, 2&#10;23CS002, Bhavana R, CSE, 2&#10;22IT015, Dinesh S, IT, 3"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-3 text-white font-mono text-xs focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.08]"
              />

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCsvModal(false)}
                  className="px-4 py-2 glass-card-hover text-slate-400 hover:text-white rounded-xl transition border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition"
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
