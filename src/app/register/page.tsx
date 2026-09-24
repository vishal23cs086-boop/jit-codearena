'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Code2, ArrowRight, ShieldCheck, GraduationCap, AlertCircle } from 'lucide-react';

const DEPARTMENTS = [
  'CSE',
  'IT',
  'AI&DS',
  'ECE',
  'MECH',
  'CIVIL',
  'EEE',
  'CSBS',
];

const YEARS = [
  { value: 1, label: '1st Year (B.E / B.Tech)' },
  { value: 2, label: '2nd Year (B.E / B.Tech)' },
  { value: 3, label: '3rd Year (B.E / B.Tech)' },
  { value: 4, label: '4th Year (B.E / B.Tech)' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { registerStudent } = useAuth();

  const [fullName, setFullName] = useState('');
  const [registerNumber, setRegisterNumber] = useState('');
  const [department, setDepartment] = useState('CSE');
  const [year, setYear] = useState<number>(2);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanRegNo = registerNumber.trim().toUpperCase();
    if (!cleanRegNo) {
      setError('Register number is required.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      const res = await registerStudent({
        fullName: fullName.trim() || cleanRegNo,
        registerNumber: cleanRegNo,
        department,
        year,
        password,
      });

      if (res.success) {
        router.push('/student/dashboard');
      } else {
        setError(res.error || 'Failed to create student account.');
      }
    } catch (err: any) {
      setError(err?.message || 'Server error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto text-white shadow-lg shadow-indigo-600/30">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-white">JIT CodeArena</h1>
          <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">
            Institutional Online Coding Assessment Platform
          </p>
          <h2 className="text-base font-bold text-slate-200 pt-2">Create Student Account</h2>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              Student Full Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Harish Kumar S"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              College Register Number (Unique)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 22CS084"
              value={registerNumber}
              onChange={(e) => setRegisterNumber(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono text-sm uppercase"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Used as your primary login credential.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 text-sm"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Academic Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 text-sm"
              >
                {YEARS.map((y) => (
                  <option key={y.value} value={y.value}>
                    {y.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              Create Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 mt-4"
          >
            <span>{loading ? 'Creating Account...' : 'CREATE ACCOUNT'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-800 text-xs text-slate-400">
          Already registered?{' '}
          <Link href="/login" className="text-indigo-400 font-semibold hover:underline">
            Sign In with Register Number
          </Link>
        </div>
      </div>
    </div>
  );
}
