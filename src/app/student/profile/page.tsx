'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  GraduationCap,
  Shield,
  Calendar,
  Mail,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Award,
} from 'lucide-react';

export default function StudentProfilePage() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Please sign in to view your profile</h2>
        <Link
          href="/login"
          className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
        >
          Go to Student Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
      <div>
        <Link
          href="/student/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-indigo-400" />
          <span>Candidate Academic Profile</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Registered institutional credentials for JIT CodeArena
        </p>
      </div>

      <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        {/* Profile Card Header */}
        <div className="flex items-center gap-4 pb-6 border-b border-white/[0.08]">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-black text-2xl shadow-inner">
            {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'S'}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-white">{user.full_name}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {user.status ? user.status.toUpperCase() : 'ACTIVE'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">{user.email}</p>
          </div>
        </div>

        {/* Read-Only Academic Attributes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.08] space-y-1">
            <span className="text-slate-400 flex items-center justify-between">
              <span>Register Number</span>
              <Lock className="w-3 h-3 text-slate-500" />
            </span>
            <div className="text-sm font-bold text-white font-mono">{user.register_number}</div>
            <span className="text-[10px] text-slate-500">Official college registration key</span>
          </div>

          <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.08] space-y-1">
            <span className="text-slate-400 flex items-center justify-between">
              <span>Department</span>
              <Lock className="w-3 h-3 text-slate-500" />
            </span>
            <div className="text-sm font-bold text-white">{user.department}</div>
            <span className="text-[10px] text-slate-500">School of Engineering</span>
          </div>

          <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.08] space-y-1">
            <span className="text-slate-400 flex items-center justify-between">
              <span>Enrolled Academic Year</span>
              <Lock className="w-3 h-3 text-slate-500" />
            </span>
            <div className="text-sm font-bold text-white">Year {user.year} (Semester {user.year * 2})</div>
            <span className="text-[10px] text-slate-500">B.E / B.Tech Degree Programme</span>
          </div>

          <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.08] space-y-1">
            <span className="text-slate-400 block">Section</span>
            <div className="text-sm font-bold text-white">{user.section || 'A'}</div>
            <span className="text-[10px] text-slate-500">Cohort Division</span>
          </div>
        </div>

        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-xs text-indigo-300 leading-relaxed flex items-start gap-2.5 backdrop-blur-md">
          <Shield className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
          <p>
            <strong>Examination Integrity Policy:</strong> Register Number, Department, and Academic Year are verified academic identifiers and cannot be altered by students. If your details require correction, please submit an official request to the Exam Cell.
          </p>
        </div>
      </div>
    </div>
  );
}
