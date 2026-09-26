'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Users,
  Radio,
  Activity,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Clock,
  Eye,
  AlertTriangle,
} from 'lucide-react';

export type DrilldownCategory =
  | 'totalStudents'
  | 'online'
  | 'in_assessment'
  | 'completed'
  | 'violations';

interface DashboardDrilldownModalProps {
  category: DrilldownCategory | null;
  onClose: () => void;
  onSelectStudent?: (studentId: string) => void;
}

export const DashboardDrilldownModal: React.FC<DashboardDrilldownModalProps> = ({
  category,
  onClose,
  onSelectStudent,
}) => {
  const [activeTab, setActiveTab] = useState<DrilldownCategory>('totalStudents');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (category) {
      setActiveTab(category);
    }
  }, [category]);

  const fetchRecords = async (cat: DrilldownCategory) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/dashboard-drilldown?category=${cat}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.records)) {
        setRecords(data.records);
      } else {
        setRecords([]);
      }
    } catch (err) {
      console.warn('Error fetching drilldown records:', err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (category) {
      fetchRecords(activeTab);
    }
  }, [category, activeTab]);

  if (!category) return null;

  const tabConfig: Record<
    DrilldownCategory,
    { label: string; icon: React.ComponentType<any>; color: string; badge: string; description: string }
  > = {
    totalStudents: {
      label: 'Total Students',
      icon: Users,
      color: 'indigo',
      badge: 'Registered Candidates',
      description: 'Institutional student records registered in Turso database',
    },
    online: {
      label: 'Online Now',
      icon: Radio,
      color: 'emerald',
      badge: 'Active Heartbeats',
      description: 'Candidates with telemetry heartbeats received in the last 90 seconds',
    },
    in_assessment: {
      label: 'In Assessment',
      icon: Activity,
      color: 'blue',
      badge: 'Active Examination Sessions',
      description: 'Candidates currently participating in ongoing timed tests',
    },
    completed: {
      label: 'Completed',
      icon: CheckCircle2,
      color: 'purple',
      badge: 'Submitted Assessments',
      description: 'Assessment sessions officially finalized and evaluated',
    },
    violations: {
      label: 'Violations',
      icon: ShieldAlert,
      color: 'rose',
      badge: 'Proctoring Security Audit',
      description: 'Real-time security deviations and anti-cheating incidents recorded in DB',
    },
  };

  const currentTab = tabConfig[activeTab];

  const filteredRecords = records.filter((r) => {
    const term = searchTerm.toLowerCase();
    const name = String(r.student_name || r.name || '').toLowerCase();
    const regNo = String(r.register_number || '').toLowerCase();
    const dept = String(r.department || '').toLowerCase();
    const assessment = String(r.assessment_title || r.test_title || '').toLowerCase();
    const vType = String(r.violation_type || r.event_type || '').toLowerCase();
    return (
      name.includes(term) ||
      regNo.includes(term) ||
      dept.includes(term) ||
      assessment.includes(term) ||
      vType.includes(term)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/70">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs shrink-0 ${
                activeTab === 'totalStudents'
                  ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                  : activeTab === 'online'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : activeTab === 'in_assessment'
                  ? 'bg-blue-50 border border-blue-200 text-blue-700'
                  : activeTab === 'completed'
                  ? 'bg-purple-50 border border-purple-200 text-purple-700'
                  : 'bg-rose-50 border border-rose-200 text-rose-700'
              }`}
            >
              <currentTab.icon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900">{currentTab.label} Drill-Down</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-white border border-slate-200 text-slate-700 shadow-2xs">
                  {records.length} Records in Turso
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{currentTab.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchRecords(activeTab)}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-xl border border-slate-200 transition shadow-2xs"
              title="Refresh Records"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-xl border border-slate-200 transition shadow-2xs"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl overflow-x-auto text-xs">
            {(Object.keys(tabConfig) as DrilldownCategory[]).map((tabKey) => {
              const cfg = tabConfig[tabKey];
              const isActive = activeTab === tabKey;
              return (
                <button
                  key={tabKey}
                  onClick={() => {
                    setActiveTab(tabKey);
                    setSearchTerm('');
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <cfg.icon className="w-3.5 h-3.5" />
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Records Table View */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-24 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-mono">
                Querying live database records from Turso...
              </p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-20 text-center space-y-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-sm font-bold text-slate-700">No records found</p>
              <p className="text-xs text-slate-500">
                {searchTerm
                  ? `No entries match "${searchTerm}".`
                  : `No records currently exist for ${currentTab.label.toLowerCase()}.`}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                {activeTab === 'totalStudents' && (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-3 font-mono">Roll No</th>
                        <th className="py-3 px-3">Department & Year</th>
                        <th className="py-3 px-3 text-center">Attempts</th>
                        <th className="py-3 px-3">Registered At</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRecords.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block">{s.name}</span>
                            <span className="text-[11px] text-slate-500 font-mono">{s.email}</span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-indigo-600">
                            {s.register_number}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-800">{s.department}</span>
                            <span className="text-slate-400 font-normal"> • Year {s.year} ({s.section})</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {s.attempts_count} Tests
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                            {s.created_at ? new Date(s.created_at).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {onSelectStudent && (
                              <button
                                onClick={() => onSelectStudent(s.id)}
                                className="px-3 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-medium rounded-lg text-xs transition border border-slate-200"
                              >
                                View Details
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'online' && (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-3 font-mono">Roll No</th>
                        <th className="py-3 px-3">Dept & Year</th>
                        <th className="py-3 px-3">Current Status</th>
                        <th className="py-3 px-3">Active Assessment / Activity</th>
                        <th className="py-3 px-3">Last Seen</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRecords.map((p) => (
                        <tr key={p.student_id || p.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-bold text-slate-900">{p.name || p.student_name}</td>
                          <td className="py-3 px-3 font-mono font-bold text-indigo-600">{p.register_number}</td>
                          <td className="py-3 px-3 font-semibold text-slate-800">
                            {p.department} Year {p.year}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                p.session_status === 'WARNING'
                                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                                  : p.session_status === 'IN_ASSESSMENT'
                                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {p.session_status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-700 max-w-xs truncate">
                            {p.assessment_title}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                            {p.last_seen_formatted || (p.last_seen ? new Date(p.last_seen).toLocaleTimeString() : 'Recent')}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {onSelectStudent && (
                              <button
                                onClick={() => onSelectStudent(p.student_id || p.id)}
                                className="px-3 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-medium rounded-lg text-xs transition border border-slate-200"
                              >
                                View Details
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'in_assessment' && (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-3 font-mono">Roll No</th>
                        <th className="py-3 px-3">Assessment</th>
                        <th className="py-3 px-3">Start Time</th>
                        <th className="py-3 px-3 text-center">Tab Deviations</th>
                        <th className="py-3 px-3 text-center">Fullscreen Exits</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRecords.map((a) => (
                        <tr key={a.attempt_id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block">{a.student_name}</span>
                            <span className="text-[11px] text-slate-500">{a.department} Year {a.year}</span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-indigo-600">{a.register_number}</td>
                          <td className="py-3 px-3 font-semibold text-slate-800">{a.assessment_title}</td>
                          <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                            {a.start_time ? new Date(a.start_time).toLocaleTimeString() : 'N/A'}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-cyan-700">
                            {a.tab_switches || 0}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-rose-700">
                            {a.fullscreen_exits || 0}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {onSelectStudent && (
                              <button
                                onClick={() => onSelectStudent(a.student_id)}
                                className="px-3 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-medium rounded-lg text-xs transition border border-slate-200"
                              >
                                View Details
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'completed' && (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-3 font-mono">Roll No</th>
                        <th className="py-3 px-3">Assessment</th>
                        <th className="py-3 px-3 text-center">Score</th>
                        <th className="py-3 px-3 text-center">Percentage</th>
                        <th className="py-3 px-3 text-center">Finish Rank</th>
                        <th className="py-3 px-3">Completion Date</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRecords.map((c) => (
                        <tr key={c.attempt_id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block">{c.student_name}</span>
                            <span className="text-[11px] text-slate-500">{c.department} Year {c.year}</span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-indigo-600">{c.register_number}</td>
                          <td className="py-3 px-3 font-semibold text-slate-800">{c.assessment_title}</td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-emerald-600">
                            {c.score}/{c.max_score}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                            {c.percentage}%
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              #{c.completion_rank}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                            {c.completed_at ? new Date(c.completed_at).toLocaleString() : 'Submitted'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {onSelectStudent && (
                              <button
                                onClick={() => onSelectStudent(c.student_id)}
                                className="px-3 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-medium rounded-lg text-xs transition border border-slate-200"
                              >
                                View Details
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* VIOLATIONS TAB (Requirement 2) */}
                {activeTab === 'violations' && (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-3 font-mono">Roll Number</th>
                        <th className="py-3 px-2">Dept</th>
                        <th className="py-3 px-2 text-center">Year</th>
                        <th className="py-3 px-3">Assessment</th>
                        <th className="py-3 px-3">Violation Type</th>
                        <th className="py-3 px-3">Timestamp</th>
                        <th className="py-3 px-3">Question</th>
                        <th className="py-3 px-2 text-center">Warning</th>
                        <th className="py-3 px-2 text-center">Total Events</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRecords.map((v) => (
                        <tr key={v.log_id || v.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-bold text-slate-900">{v.student_name}</td>
                          <td className="py-3 px-3 font-mono font-bold text-indigo-600">{v.register_number}</td>
                          <td className="py-3 px-2 font-semibold text-slate-700">{v.department}</td>
                          <td className="py-3 px-2 text-center font-bold text-slate-700">Year {v.year}</td>
                          <td className="py-3 px-3 text-slate-800 font-medium max-w-[150px] truncate">
                            {v.assessment_title}
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              {v.violation_type}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                            {v.time_formatted || (v.timestamp ? new Date(v.timestamp).toLocaleTimeString() : 'N/A')}
                          </td>
                          <td className="py-3 px-3 text-slate-600 max-w-[140px] truncate">
                            {v.question || 'Assessment Question'}
                          </td>
                          <td className="py-3 px-2 text-center font-mono font-bold text-amber-700">
                            {v.warning_count} / 3
                          </td>
                          <td className="py-3 px-2 text-center font-mono font-bold text-rose-700">
                            {v.total_events}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {onSelectStudent && (
                              <button
                                onClick={() => onSelectStudent(v.student_id || v.id)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-medium rounded-lg text-[11px] transition border border-slate-200"
                              >
                                History
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <span>Authoritative Turso records • Click any candidate to view security history</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-semibold transition"
          >
            Close Drill-Down
          </button>
        </div>
      </div>
    </div>
  );
};
