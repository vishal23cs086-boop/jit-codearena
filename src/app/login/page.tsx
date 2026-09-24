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
  Eye,
  EyeOff,
  CheckCircle2,
  Terminal,
  Cpu,
  Sparkles,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { loginStudent } = useAuth();

  const [registerNumber, setRegisterNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        setError(res.error || 'Invalid credentials. Please verify your Register Number and password.');
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-[calc(100vh-4rem)] grid grid-cols-1 md:grid-cols-2 bg-[#070A12]">
      {/* LEFT COLUMN: BRANDING & MOTTO */}
      <div className="hidden md:flex flex-col justify-between p-12 lg:p-16 border-r border-white/[0.08] relative overflow-hidden bg-gradient-to-b from-[#0B1020]/90 via-[#070A12]/80 to-[#070A12]">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none -z-10" />

        {/* Brand header */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.12] flex items-center justify-center shrink-0 shadow-xs">
            <img
              src="/jit-logo.png"
              alt="Jansons Institute of Technology Crest"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xl text-white tracking-tight">JIT</span>
              <span className="font-black text-xl text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400">
                CodeArena
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Jansons Institute of Technology</p>
          </div>
        </div>

        {/* Main Motto & Pitch */}
        <div className="max-w-md space-y-6 my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Academic Year 2025–2026 Portal</span>
          </div>

          <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Code.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              Think.
            </span>{' '}
            Perform.
          </h2>

          <p className="text-sm text-slate-400 leading-relaxed">
            A secure institutional platform for programming assessments. Server-isolated Python execution, real-time proctoring telemetry, and instant automated evaluation.
          </p>

          <div className="space-y-3 pt-2 text-xs text-slate-300">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Server-isolated Judge0 Python execution</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Real-time anti-cheating & tab switch telemetry</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Automated completion-order rank logging</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-[11px] text-slate-400 font-mono">
          Examination Cell • Jansons Institute of Technology, Coimbatore
        </div>
      </div>

      {/* RIGHT COLUMN: LOGIN FORM */}
      <div className="flex items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md glass-card rounded-3xl p-8 sm:p-10 space-y-6">
          {/* Card Header */}
          <div className="space-y-2 text-center md:text-left">
            <div className="md:hidden flex justify-center mb-3">
              <div className="w-14 h-14 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.12] flex items-center justify-center shadow-xs">
                <img
                  src="/jit-logo.png"
                  alt="Jansons Institute of Technology Crest"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            <h1 className="text-2xl font-black text-white tracking-tight">Candidate Sign In</h1>
            <p className="text-xs text-slate-400">
              Enter your college credentials to access active examination sessions.
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1.5">
                College Register Number
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 23CS086"
                value={registerNumber}
                onChange={(e) => setRegisterNumber(e.target.value)}
                className="w-full glass-input rounded-xl p-3 text-sm font-mono uppercase placeholder:text-slate-600 focus:border-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-300 font-semibold">Password</label>
                <button
                  type="button"
                  onClick={() => alert('Password reset is managed by the Examination Cell coordinator in Hall A-204.')}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 transition"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full glass-input rounded-xl p-3 pr-10 text-sm placeholder:text-slate-600 focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 mt-2 group"
            >
              <span>{loading ? 'Verifying Identity...' : 'Sign In to Arena'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </form>

          {/* Navigation Links */}
          <div className="space-y-3 pt-4 border-t border-white/[0.08] text-center text-xs">
            <p className="text-slate-400">
              First time taking an assessment?{' '}
              <Link href="/register" className="text-indigo-400 font-semibold hover:underline">
                Create Student Account
              </Link>
            </p>

            <div>
              <Link
                href="/admin/login"
                className="inline-flex items-center gap-1.5 text-xs text-amber-400/80 hover:text-amber-300 transition"
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Examination Cell & Faculty Portal →</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

