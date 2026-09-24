'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Laptop,
  Globe,
  User,
  Shield,
  KeyRound,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

interface LoginRecord {
  id: string;
  user_id: string;
  user_role: string;
  register_number: string;
  full_name: string;
  login_time: string;
  logout_time?: string | null;
  last_active: string;
  ip_address: string;
  user_agent: string;
  status: string;
}

export default function LoginActivityPage() {
  const [logs, setLogs] = useState<LoginRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'admin'>('all');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/login-activity?limit=100');
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.warn('Failed to load login activity:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.register_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ip_address.includes(searchTerm);

      if (!matchesSearch) return false;
      if (roleFilter !== 'all' && log.user_role.toLowerCase() !== roleFilter) return false;
      return true;
    });
  }, [logs, searchTerm, roleFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-600">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Login Activity Audit Trail</h1>
          </div>
          <p className="text-xs text-slate-500">
            Chronological audit of institutional authentications, device fingerprints, and active sessions.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="glass-button p-2.5 rounded-xl text-slate-600 hover:text-indigo-600 transition self-start sm:self-center"
          title="Refresh logs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, register number, or IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto text-xs">
          {(['all', 'student', 'admin'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-xl font-medium uppercase tracking-wider text-[11px] transition ${
                roleFilter === r
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {r === 'all' ? 'All Roles' : `${r}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Querying authentication records from Turso...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs">
          <EmptyState
            title="No Login Activity Logged"
            description={
              searchTerm
                ? `No records found matching "${searchTerm}".`
                : 'No login events have been registered in the database yet. When users sign in, their session footprints will appear here.'
            }
          />
        </div>
      ) : (
        <div className="glass-card rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">IP Address</th>
                  <th className="py-3 px-3">Device / Browser</th>
                  <th className="py-3 px-3">Login Time</th>
                  <th className="py-3 px-3">Last Active</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const isAdmin = log.user_role.toLowerCase() === 'admin';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isAdmin ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
                          }`}>
                            {isAdmin ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{log.full_name}</span>
                            <span className="font-mono text-[11px] text-slate-500">{log.register_number}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          isAdmin
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {log.user_role}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600">
                        {log.ip_address}
                      </td>

                      <td className="py-3.5 px-3 text-slate-500 max-w-xs truncate" title={log.user_agent}>
                        {log.user_agent}
                      </td>

                      <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600">
                        {new Date(log.login_time).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-3 font-mono text-[11px] text-slate-500">
                        {new Date(log.last_active).toLocaleTimeString()}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[10px] uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {log.status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
