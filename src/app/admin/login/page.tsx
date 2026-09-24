'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, ArrowRight, AlertCircle, Lock, GraduationCap } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const { loginAdmin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your institutional faculty or administrator email.');
      return;
    }

    setLoading(true);

    try {
      const res = await loginAdmin(email.trim(), password);
      if (res.success) {
        router.push('/admin/dashboard');
      } else {
        setError(res.error || 'Invalid credentials or unauthorized account.');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 bg-amber-600/20 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-600/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-white">JIT CodeArena</h1>
          <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider">
            Examination Cell & Invigilation Control
          </p>
          <h2 className="text-base font-bold text-slate-200 pt-2">Faculty / Administrator Login</h2>
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
              Institutional Email
            </label>
            <input
              type="email"
              required
              placeholder="e.g. examcell@jit.edu.in or hod.cse@jit.edu.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              Administrator Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 mt-2"
          >
            <span>{loading ? 'Verifying Privileges...' : 'AUTHENTICATE ACCESS'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-3 border-t border-slate-800 text-center text-xs">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            <GraduationCap className="w-4 h-4 text-indigo-400" />
            <span>Switch to Student Portal Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
