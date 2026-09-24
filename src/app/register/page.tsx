'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Code2,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  AlertCircle,
  Eye,
  EyeOff,
  Check,
  Sparkles,
  Mail,
} from 'lucide-react';

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
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('CSE');
  const [year, setYear] = useState<number>(2);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Compute password strength
  const getPasswordStrength = () => {
    if (!password) return { score: 0, label: '', color: 'bg-transparent' };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) return { score: 25, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2) return { score: 50, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 75, label: 'Good', color: 'bg-blue-500' };
    return { score: 100, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanRegNo = registerNumber.trim().toUpperCase();
    if (!cleanRegNo) {
      setError('Register number is required.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid Gmail / Email address.');
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
        email: cleanEmail,
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
      <div className="w-full max-w-lg glass-card rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-200/50 space-y-6 border border-slate-200/90">
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
          <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">
            Jansons Institute of Technology
          </p>
          <h2 className="text-xs font-semibold text-slate-500 pt-1">Candidate Registration Portal</h2>
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
              Student Full Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Harish Kumar S"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="glass-input w-full rounded-xl p-3 text-slate-900 placeholder-slate-400 text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-700 font-semibold block mb-1">
              College Register Number (Unique)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 22CS084"
              value={registerNumber}
              onChange={(e) => setRegisterNumber(e.target.value)}
              className="glass-input w-full rounded-xl p-3 text-slate-900 placeholder-slate-400 font-mono text-sm uppercase focus:outline-none"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Used as your primary login credential.
            </span>
          </div>

          <div>
            <label className="text-slate-700 font-semibold block mb-1">
              Gmail / College Email ID
            </label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="e.g. student@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input w-full rounded-xl p-3 pl-9 text-slate-900 placeholder-slate-400 text-sm focus:outline-none"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Used for assessment reports and official correspondence.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-700 font-semibold block mb-1">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="glass-input w-full rounded-xl p-3 text-slate-800 text-sm focus:outline-none bg-white"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d} className="bg-white text-slate-800">
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-700 font-semibold block mb-1">
                Academic Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="glass-input w-full rounded-xl p-3 text-slate-800 text-sm focus:outline-none bg-white"
              >
                {YEARS.map((y) => (
                  <option key={y.value} value={y.value} className="bg-white text-slate-800">
                    {y.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-slate-700 font-semibold block mb-1">
              Create Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
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

            {password && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Strength:</span>
                  <span className="font-semibold text-slate-700">{strength.label}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${strength.color}`}
                    style={{ width: `${strength.score}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-slate-700 font-semibold block mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="glass-input w-full rounded-xl p-3 pr-10 text-slate-900 placeholder-slate-400 text-sm focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 mt-4"
          >
            <span>{loading ? 'Creating Account...' : 'CREATE ACCOUNT'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-3 border-t border-slate-100 text-xs text-slate-500">
          Already registered?{' '}
          <Link href="/login" className="text-indigo-600 font-semibold hover:underline">
            Sign In with Register Number
          </Link>
        </div>
      </div>
    </div>
  );
}
