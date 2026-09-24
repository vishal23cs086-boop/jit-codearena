'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { MOCK_STUDENTS } from '@/lib/mockData';
import {
  Code2,
  GraduationCap,
  Shield,
  ArrowRight,
  Sparkles,
  Lock,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { loginAsStudent, loginAsAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'student' | 'admin'>('student');
  const [regNo, setRegNo] = useState('');
  const [password, setPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('hod.cse@jit.edu.in');
  const [adminPassword, setAdminPassword] = useState('admin123');

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (regNo.trim()) {
      loginAsStudent(regNo.trim());
      router.push('/student/dashboard');
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginAsAdmin();
    router.push('/admin/dashboard');
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto text-white shadow-lg shadow-indigo-600/30">
            <Code2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">JIT CodeArena</h1>
          <p className="text-xs text-slate-400">
            College Python Coding Assessment Platform
          </p>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('student')}
            className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'student'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Student Portal</span>
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'admin'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Admin / Faculty</span>
          </button>
        </div>

        {/* Student Form */}
        {activeTab === 'student' ? (
          <form onSubmit={handleStudentSubmit} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                College Register Number
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 22CS084 or 23IT045"
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 font-mono text-sm uppercase"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 text-sm"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Default password: your college DOB or demo credentials
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              <span>Sign In as Student</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Quick Demo Student Pills */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <span className="text-[11px] text-slate-400 block font-medium">Quick Demo Profiles:</span>
              <div className="flex flex-wrap gap-1.5">
                {MOCK_STUDENTS.slice(0, 3).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      setRegNo(st.register_number);
                      loginAsStudent(st.register_number);
                      router.push('/student/dashboard');
                    }}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-[11px] font-mono transition"
                  >
                    {st.register_number} ({st.department})
                  </button>
                ))}
              </div>
            </div>
          </form>
        ) : (
          /* Admin Form */
          <form onSubmit={handleAdminSubmit} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Faculty / HOD Email</label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Admin Password</label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2"
            >
              <Shield className="w-4 h-4" />
              <span>Sign In to Examination Cell</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
