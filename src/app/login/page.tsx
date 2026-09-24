'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  GraduationCap,
  ArrowRight,
  Shield,
  AlertCircle,
  Lock,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { loginStudent } = useAuth();

  const [registerNumber, setRegisterNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanRegNo = registerNumber.trim().toUpperCase();
    if (!cleanRegNo) {
      setError('Please enter your College Register Number.');
      return;
    }

    setLoading(true);

    try {
      const res = await loginStudent(cleanRegNo, password);
      if (res.success) {
        router.push('/student/dashboard');
      } else {
        setError(res.error || 'Invalid credentials.');
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto text-white shadow-lg shadow-indigo-600/30">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-white">JIT CodeArena</h1>
          <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">
            Institutional Online Coding Assessment Platform
          </p>
          <h2 className="text-base font-bold text-slate-200 pt-2">Student Login</h2>
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
              Register Number
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 22CS084"
              value={registerNumber}
              onChange={(e) => setRegisterNumber(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono text-sm uppercase"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-semibold">Password</label>
            </div>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 mt-2"
          >
            <span>{loading ? 'Authenticating...' : 'LOGIN'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="space-y-3 pt-3 border-t border-slate-800 text-center text-xs">
          <p className="text-slate-400">
            First time taking an assessment?{' '}
            <Link href="/register" className="text-indigo-400 font-semibold hover:underline">
              Create Student Account
            </Link>
          </p>

          <div>
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition"
            >
              <Shield className="w-3.5 h-3.5 text-amber-500" />
              <span>Faculty & Exam Cell Login →</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
