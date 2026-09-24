'use client';

import React, { useState, useEffect } from 'react';
import { ActivityEventType, ActivityLog } from '@/types';
import { fetchActivityLogs } from '@/lib/db';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Activity,
  Search,
  Filter,
  ShieldAlert,
  Clock,
  Code2,
  Terminal,
  LogOut,
  Loader2,
} from 'lucide-react';

interface AuditRow {
  id: string;
  studentName: string;
  registerNumber: string;
  department: string;
  eventType: ActivityEventType;
  details: string;
  timestamp: string;
  severity: 'normal' | 'warning' | 'alert';
}

export default function AdminAuditLogsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadLogs() {
      setLoading(true);
      try {
        const data = await fetchActivityLogs();
        setLogs(data);
      } catch (err) {
        console.error('Failed to load activity logs:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  const auditRows: AuditRow[] = logs.map((log) => {
    let detailsStr = '';
    if (typeof log.details === 'string') {
      detailsStr = log.details;
    } else if (log.details && typeof log.details === 'object') {
      const d = log.details as Record<string, any>;
      detailsStr = d.message || d.reason || d.action || JSON.stringify(d);
    }

    let severity: AuditRow['severity'] = 'normal';
    if (log.event_type === 'FULLSCREEN_EXIT') {
      severity = 'alert';
    } else if (
      log.event_type === 'TAB_SWITCH' ||
      log.event_type === 'PASTE_ATTEMPT' ||
      log.event_type === 'COPY_ATTEMPT' ||
      log.event_type === 'WARNING_TRIGGERED'
    ) {
      severity = 'warning';
    }

    return {
      id: log.id,
      studentName: log.profiles?.full_name || 'Candidate',
      registerNumber: log.profiles?.email ? log.profiles.email.split('@')[0].toUpperCase() : log.student_id || 'CANDIDATE',
      department: 'Engineering',
      eventType: log.event_type,
      details: detailsStr || `${log.event_type} registered by exam proctor`,
      timestamp: log.created_at ? new Date(log.created_at).toLocaleTimeString() : 'Just now',
      severity,
    };
  });

  const filteredLogs = auditRows.filter((row) => {
    const matchesSearch =
      row.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.registerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.details.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || row.eventType === filterType;
    return matchesSearch && matchesType;
  });

  const getBadgeStyle = (eventType: ActivityEventType, severity: AuditRow['severity']) => {
    if (severity === 'alert') {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (severity === 'warning') {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <Activity className="w-7 h-7 text-indigo-600" />
          <span>Institutional Examination Audit Log Stream</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Chronological record of student actions, server submissions, and anti-cheating detections
        </p>
      </div>

      {auditRows.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-12 border border-slate-200/90 shadow-sm shadow-slate-900/5">
          <EmptyState
            title="No activity recorded"
            description="Assessment and security events will appear here as candidates interact with the testing environment."
            action={{
              label: "View Live Monitor",
              href: "/admin/monitor",
            }}
          />
        </div>
      ) : (
        <>
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/90 backdrop-blur-xl p-3 rounded-2xl border border-slate-200/90 shadow-sm shadow-slate-900/5">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search candidate name, reg no, details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <span className="text-xs text-slate-500 font-medium">Event Type:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl px-3 py-2 focus:bg-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Events</option>
                <option value="TAB_SWITCH">Tab Switches</option>
                <option value="FULLSCREEN_EXIT">Fullscreen Exits</option>
                <option value="PASTE_ATTEMPT">Paste Attempts</option>
                <option value="CODE_SUBMITTED">Code Submissions</option>
                <option value="CODE_SAVED">Code Saved</option>
                <option value="TEST_STARTED">Test Started</option>
                <option value="TEST_COMPLETED">Test Completed</option>
              </select>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm shadow-slate-900/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-500 uppercase tracking-wider font-semibold font-sans text-[11px]">
                    <th className="py-4 px-4">Timestamp</th>
                    <th className="py-4 px-3">Candidate</th>
                    <th className="py-4 px-3">Reg No</th>
                    <th className="py-4 px-3">Event Type</th>
                    <th className="py-4 px-4">Audit Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {row.timestamp}
                      </td>
                      <td className="py-4 px-3 font-sans font-semibold text-slate-900">
                        {row.studentName}
                      </td>
                      <td className="py-4 px-3 text-indigo-600 font-bold">{row.registerNumber}</td>
                      <td className="py-4 px-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${getBadgeStyle(
                            row.eventType,
                            row.severity
                          )}`}
                        >
                          {row.eventType}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-600 font-sans text-xs">
                        {row.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
