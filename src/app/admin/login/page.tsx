'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, ArrowRight, AlertCircle, Lock, GraduationCap, KeyRound, Eye, EyeOff } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const { loginAdmin } = useAuth();

  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!adminId.trim()) {
      setError('Please enter your Administrator ID.');
      return;
    }

    setLoading(true);

    try {
      const res = await loginAdmin(adminId.trim(), password);
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
      <div className="w-full max-w-md glass-card rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-200/50 space-y-6 border border-slate-200/90">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 p-2 bg-white border border-slate-200 rounded-2xl mx-auto shadow-xs flex items-center justify-center">
            <img
              src="/jit-logo.png"
              alt="Jansons Institute of Technology Crest"
              className="w-full h-full object-contain filter drop-shadow-sm"
            />
          </div>
          <h1 className="text-2xl font-black text-slate-900">JIT CodeArena</h1>
          <p className="text-xs text-amber-700 font-bold uppercase tracking-wider">
            Jansons Institute of Technology • Examination Cell
          </p>
          <h2 className="text-xs font-semibold text-slate-500 pt-0.5">Faculty & Administrator Login</h2>
        </div>


        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-700 font-semibold block mb-1">
              Administrator ID
            </label>
            <input
              type="text"
              required
              placeholder="e.g. ADMIN"
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              className="glass-input w-full rounded-xl p-3 text-slate-900 placeholder-slate-400 text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-700 font-semibold block mb-1">
              Administrator Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input w-full rounded-xl p-3 pr-10 text-slate-900 placeholder-slate-400 text-sm focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition shadow-md shadow-amber-600/25 flex items-center justify-center gap-2 mt-2"
          >
            <span>{loading ? 'Verifying Privileges...' : 'AUTHENTICATE ACCESS'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-3 border-t border-slate-100 text-center text-xs">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-indigo-600 font-medium transition"
          >
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            <span>Switch to Student Assessment Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
