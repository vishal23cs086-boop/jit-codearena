// ==============================================================================
// JIT CodeArena - Institutional Database & Repository Service
// Turso LibSQL integrated data layer with local fallback
// ==============================================================================

import {
  StudentProfile,
  Test,
  Question,
  TestAttempt,
  Submission,
  ActivityLog,
  LiveMonitorStudent,
  LeaderboardEntry,
} from '@/types';

// Client-side persistent cache keys (for session persistence when offline)
const STORAGE_KEYS = {
  STUDENTS: 'jit_ca_students_v2',
  QUESTIONS: 'jit_ca_questions_v2',
  TESTS: 'jit_ca_tests_v2',
  ATTEMPTS: 'jit_ca_attempts_v2',
  SUBMISSIONS: 'jit_ca_submissions_v2',
  LOGS: 'jit_ca_logs_v2',
};

function getLocalStore<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setLocalStore<T>(key: string, items: T[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Ignore storage quota
  }
}

// ==============================================================================
// 1. STUDENTS SERVICE
// ==============================================================================

export async function fetchStudents(): Promise<StudentProfile[]> {
  try {
    if (typeof window !== 'undefined') {
      const res = await fetch('/api/admin/students');
      const data = await res.json();
      if (data.success && Array.isArray(data.students)) {
        return data.students;
      }
    }
  } catch (err) {
    console.warn('API fetchStudents error:', err);
  }

  return [];
}

export async function saveStudent(student: StudentProfile): Promise<boolean> {
  try {
    if (typeof window !== 'undefined') {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: student.full_name,
          registerNumber: student.register_number,
          department: student.department,
          year: student.year,
          section: student.section,
          phone: student.phone,
        }),
      });
      if (res.ok) return true;
    }
  } catch (err) {
    console.warn('API saveStudent error:', err);
  }

  return false;
}

// ==============================================================================
// 2. QUESTIONS SERVICE
// ==============================================================================

export async function fetchQuestions(): Promise<Question[]> {
  try {
    if (typeof window !== 'undefined') {
      const res = await fetch('/api/admin/questions');
      const data = await res.json();
      if (data.success && Array.isArray(data.questions)) {
        return data.questions.map((q: any) => ({
          id: q.id,
          title: q.title,
          slug: q.id,
          description: q.description,
          input_format: q.input_format || 'Standard Input',
          output_format: q.output_format || 'Standard Output',
          constraints: q.constraints || '1 <= n <= 10^5',
          difficulty: q.difficulty === 'easy' ? 'Easy' : q.difficulty === 'hard' ? 'Hard' : 'Medium',
          topic: q.topic || 'Algorithms',
          year: Number(q.year || 2),
          starter_code: q.initial_code || 'def solution():\n    pass\n',
          marks: q.marks || 25,
          time_limit_ms: q.time_limit || 2000,
          memory_limit_kb: q.memory_limit || 128000,
          is_active: true,
          test_cases: typeof q.test_cases === 'string' ? JSON.parse(q.test_cases) : (q.test_cases || []),
        }));
      }
    }
  } catch (err) {
    console.warn('API fetchQuestions error:', err);
  }
  return [];
}

export async function saveQuestion(question: Question): Promise<boolean> {
  try {
    if (typeof window !== 'undefined') {
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: question.title,
          description: question.description,
          year: question.year || 2,
          difficulty: question.difficulty?.toLowerCase() || 'medium',
          topic: question.topic || 'Algorithms',
          marks: question.marks || 25,
          initial_code: question.starter_code,
          test_cases: question.test_cases,
          time_limit: question.time_limit_ms,
          memory_limit: question.memory_limit_kb,
          input_format: question.input_format,
          output_format: question.output_format,
          constraints: question.constraints,
        }),
      });
      return res.ok;
    }
  } catch (err) {
    console.warn('API saveQuestion error:', err);
  }
  return false;
}

export async function deleteQuestionById(id: string): Promise<boolean> {
  try {
    if (typeof window !== 'undefined') {
      const res = await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' });
      return res.ok;
    }
  } catch (err) {
    console.warn('API deleteQuestionById error:', err);
  }
  return false;
}

// ==============================================================================
// 3. TESTS / ASSESSMENTS SERVICE
// ==============================================================================

export async function fetchTests(): Promise<Test[]> {
  try {
    if (typeof window !== 'undefined') {
      // Try student endpoint first (authorized for student sessions)
      let res = await fetch('/api/student/assessments');
      if (res.status === 401 || res.status === 403) {
        // Fallback to admin assessments endpoint if caller is admin
        res = await fetch('/api/admin/assessments');
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.assessments)) {
        return data.assessments.map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description || '',
          year: Number(t.year || 2),
          question_count: Number(t.question_count || 0),
          duration_minutes: Number(t.duration || t.duration_minutes || 60),
          total_marks: Number(t.total_marks || 100),
          passing_marks: Number(t.passing_marks || 40),
          eligible_years: t.year ? [Number(t.year)] : [1, 2, 3, 4],
          eligible_departments: ['CSE', 'IT', 'AI&DS', 'ECE', 'MECH', 'CIVIL', 'EEE', 'CSBS'],
          start_time: t.start_time || '',
          end_time: t.end_time || '',
          status: t.status === 'live' || t.status === 'active' || t.status === 'published' ? 'active' : t.status === 'completed' || t.status === 'closed' ? 'ended' : 'published',
          calculated_status: t.calculated_status,
          created_at: t.created_at,
          questions: [],
        }));
      }
    }
  } catch (err) {
    console.warn('API fetchTests error:', err);
  }

  return [];
}

export async function fetchTestById(id: string): Promise<Test | null> {
  try {
    if (typeof window !== 'undefined') {
      let res = await fetch(`/api/student/assessments/${id}`);
      if (res.status === 401 || res.status === 403) {
        res = await fetch(`/api/admin/assessments/${id}`);
      }
      const data = await res.json();
      if (data.success && data.assessment) {
        const t = data.assessment;
        return {
          id: t.id,
          title: t.title,
          description: t.description || '',
          year: Number(t.year || 2),
          question_count: Number(t.question_count || 0),
          duration_minutes: Number(t.duration || t.duration_minutes || 60),
          total_marks: Number(t.total_marks || 100),
          passing_marks: Number(t.passing_marks || 40),
          eligible_years: t.year ? [Number(t.year)] : [1, 2, 3, 4],
          eligible_departments: ['CSE', 'IT', 'AI&DS', 'ECE', 'MECH', 'CIVIL', 'EEE', 'CSBS'],
          start_time: t.start_time || '',
          end_time: t.end_time || '',
          status: t.status === 'live' || t.status === 'active' || t.status === 'published' ? 'active' : t.status === 'completed' || t.status === 'closed' ? 'ended' : 'published',
          calculated_status: t.calculated_status,
          created_at: t.created_at,
          questions: (t.questions || []).map((q: any, idx: number) => ({
            id: q.id,
            test_id: t.id,
            question_id: q.id,
            order_index: q.order_index ?? idx,
            marks: q.marks || 25,
            question: {
              id: q.id,
              title: q.title,
              slug: q.id,
              description: q.description,
              input_format: q.input_format || 'Standard Input',
              output_format: q.output_format || 'Standard Output',
              constraints: q.constraints || '1 <= n <= 10^5',
              difficulty: q.difficulty === 'easy' ? 'Easy' : q.difficulty === 'hard' ? 'Hard' : 'Medium',
              topic: q.topic || 'Algorithms',
              starter_code: q.initial_code || 'def solution():\n    pass\n',
              marks: q.marks || 25,
              time_limit_ms: q.time_limit || 2000,
              memory_limit_kb: q.memory_limit || 128000,
              is_active: true,
              test_cases: q.test_cases || [],
            },
          })),
        };
      }
    }
  } catch (err) {
    console.warn('API fetchTestById error:', err);
  }

  return null;
}

export async function saveTest(test: Test): Promise<boolean> {
  try {
    if (typeof window !== 'undefined') {
      const res = await fetch('/api/admin/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: test.title,
          description: test.description,
          duration: test.duration_minutes,
          total_marks: test.total_marks,
          start_time: test.start_time,
          end_time: test.end_time,
          status: test.status === 'active' ? 'live' : 'draft',
        }),
      });
      if (res.ok) return true;
    }
  } catch (err) {
    console.warn('API saveTest error:', err);
  }

  const existing = getLocalStore<Test>(STORAGE_KEYS.TESTS);
  const updated = existing.filter((t) => t.id !== test.id);
  updated.unshift(test);
  setLocalStore(STORAGE_KEYS.TESTS, updated);
  return true;
}

// ==============================================================================
// 4. TEST ATTEMPTS SERVICE
// ==============================================================================

export async function fetchAttempts(): Promise<TestAttempt[]> {
  try {
    if (typeof window !== 'undefined') {
      const res = await fetch('/api/admin/reports');
      const data = await res.json();
      if (data.success && Array.isArray(data.attempts)) {
        return data.attempts;
      }
    }
  } catch (err) {
    console.warn('API fetchAttempts error:', err);
  }
  return [];
}

export async function saveAttempt(attempt: TestAttempt): Promise<boolean> {
  return true;
}

// ==============================================================================
// 5. ACTIVITY LOGS SERVICE
// ==============================================================================

export async function fetchActivityLogs(): Promise<ActivityLog[]> {
  try {
    if (typeof window !== 'undefined') {
      const res = await fetch('/api/admin/logs?limit=200');
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        return data.logs.map((l: any) => ({
          id: l.id,
          student_id: l.student_id || 'unknown',
          event_type: l.event_type,
          details: { description: l.description, ...l.metadata },
          created_at: l.timestamp,
        }));
      }
    }
  } catch (err) {
    console.warn('API fetchActivityLogs error:', err);
  }
  return [];
}

export async function recordActivityLog(log: ActivityLog): Promise<boolean> {
  try {
    if (typeof window !== 'undefined') {
      await fetch('/api/exam/log-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: log.student_id,
          attemptId: log.attempt_id,
          eventType: log.event_type,
          details: log.details,
        }),
      });
    }
  } catch (err) {
    // silent
  }

  const existing = getLocalStore<ActivityLog>(STORAGE_KEYS.LOGS);
  existing.unshift(log);
  setLocalStore(STORAGE_KEYS.LOGS, existing.slice(0, 200));
  return true;
}

// ==============================================================================
// 6. LIVE MONITORING AGGREGATION
// ==============================================================================

export async function fetchLiveMonitorStudents(): Promise<LiveMonitorStudent[]> {
  try {
    if (typeof window !== 'undefined') {
      const res = await fetch('/api/admin/presence');
      const data = await res.json();
      if (data.success && Array.isArray(data.students)) {
        return data.students.map((s: any) => ({
          id: s.student_id,
          attempt_id: s.active_assessment_id || undefined,
          student_name: s.full_name,
          register_number: s.register_number,
          department: s.department,
          year: s.year,
          test_title: s.active_assessment_id ? 'Coding Assessment' : 'Dashboard',
          progress: s.total_questions > 0 ? `${s.current_question_index + 1}/${s.total_questions}` : 'Active',
          current_score: 0,
          started_time: s.started_at ? new Date(s.started_at).toLocaleTimeString() : 'Recently',
          elapsed_time_seconds: s.started_at ? Math.max(0, Math.floor((Date.now() - s.started_at) / 1000)) : 0,
          status: s.session_status === 'WARNING' ? 'warning' : s.session_status === 'IN_ASSESSMENT' ? 'active' : s.session_status === 'IDLE' ? 'suspicious' : 'not_started',
          warnings_count: s.violation_count || 0,
          tab_switches: s.violation_count || 0,
          fullscreen_exits: 0,
          copy_pastes: 0,
          current_question_index: s.current_question_index || 0,
          total_submissions: 0,
          recent_logs: [],
        }));
      }
    }
  } catch (err) {
    console.warn('API fetchLiveMonitorStudents error:', err);
  }

  return [];
}
