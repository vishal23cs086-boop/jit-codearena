// ==============================================================================
// JIT CodeArena - Institutional Database & Repository Service
// Connects directly to Supabase with real tables and strict empty states
// ==============================================================================

import { createClient } from '@/lib/supabase/client';
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

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && !url.includes('mock-') && !url.includes('your-project'));
};

// Client-side persistent cache keys (for session persistence when Supabase credentials are local)
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
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          register_number,
          department,
          year,
          section,
          phone,
          status,
          created_at,
          profiles (
            id,
            email,
            full_name,
            role,
            avatar_url
          )
        `);

      if (!error && data) {
        return data.map((item: any) => ({
          id: item.id,
          email: item.profiles?.email || `${item.register_number.toLowerCase()}@student.jit.edu`,
          full_name: item.profiles?.full_name || item.register_number,
          role: 'student',
          register_number: item.register_number,
          department: item.department,
          year: item.year,
          section: item.section || 'A',
          phone: item.phone,
          status: item.status || 'active',
          created_at: item.created_at,
        }));
      }
    } catch (e) {
      console.warn('Failed to query Supabase students:', e);
    }
  }

  // Real local storage (starts empty if no one has registered)
  return getLocalStore<StudentProfile>(STORAGE_KEYS.STUDENTS);
}

export async function saveStudent(student: StudentProfile): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      // Insert profile
      await supabase.from('profiles').upsert({
        id: student.id,
        email: student.email,
        full_name: student.full_name,
        role: 'student',
      });
      // Insert student record
      const { error } = await supabase.from('students').upsert({
        id: student.id,
        register_number: student.register_number.toUpperCase(),
        department: student.department,
        year: student.year,
        section: student.section || 'A',
        phone: student.phone,
        status: student.status || 'active',
      });
      if (!error) return true;
    } catch (e) {
      console.warn('Supabase save student error:', e);
    }
  }

  const existing = getLocalStore<StudentProfile>(STORAGE_KEYS.STUDENTS);
  const updated = existing.filter((s) => s.register_number !== student.register_number);
  updated.push(student);
  setLocalStore(STORAGE_KEYS.STUDENTS, updated);
  return true;
}

// ==============================================================================
// 2. QUESTIONS SERVICE
// ==============================================================================

export async function fetchQuestions(): Promise<Question[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          test_cases (*)
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as Question[];
      }
    } catch (e) {
      console.warn('Failed to query Supabase questions:', e);
    }
  }

  // Real local storage questions (empty by default)
  return getLocalStore<Question>(STORAGE_KEYS.QUESTIONS);
}

export async function saveQuestion(question: Question): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('questions').upsert({
        id: question.id,
        title: question.title,
        slug: question.slug,
        description: question.description,
        input_format: question.input_format,
        output_format: question.output_format,
        constraints: question.constraints,
        sample_explanation: question.sample_explanation,
        difficulty: question.difficulty,
        topic: question.topic,
        starter_code: question.starter_code,
        marks: question.marks,
        time_limit_ms: question.time_limit_ms,
        memory_limit_kb: question.memory_limit_kb,
        is_active: question.is_active,
      });

      if (!error && question.test_cases?.length) {
        for (const tc of question.test_cases) {
          await supabase.from('test_cases').upsert({
            id: tc.id,
            question_id: question.id,
            input: tc.input,
            expected_output: tc.expected_output,
            is_hidden: tc.is_hidden,
            weight: tc.weight || 1,
            explanation: tc.explanation,
          });
        }
      }
      if (!error) return true;
    } catch (e) {
      console.warn('Supabase save question error:', e);
    }
  }

  const existing = getLocalStore<Question>(STORAGE_KEYS.QUESTIONS);
  const updated = existing.filter((q) => q.id !== question.id);
  updated.unshift(question);
  setLocalStore(STORAGE_KEYS.QUESTIONS, updated);
  return true;
}

export async function deleteQuestionById(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('questions').delete().eq('id', id);
      if (!error) return true;
    } catch (e) {
      console.warn('Supabase delete question error:', e);
    }
  }

  const existing = getLocalStore<Question>(STORAGE_KEYS.QUESTIONS);
  setLocalStore(
    STORAGE_KEYS.QUESTIONS,
    existing.filter((q) => q.id !== id)
  );
  return true;
}

// ==============================================================================
// 3. TESTS / ASSESSMENTS SERVICE
// ==============================================================================

export async function fetchTests(): Promise<Test[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tests')
        .select(`
          *,
          test_questions (
            id,
            order_index,
            marks,
            questions (
              *,
              test_cases (*)
            )
          )
        `)
        .order('start_time', { ascending: false });

      if (!error && data) {
        return data.map((t: any) => ({
          ...t,
          questions: t.test_questions?.map((tq: any) => ({
            id: tq.id,
            test_id: t.id,
            question_id: tq.questions?.id,
            order_index: tq.order_index,
            marks: tq.marks,
            question: tq.questions,
          })),
        }));
      }
    } catch (e) {
      console.warn('Failed to query Supabase tests:', e);
    }
  }

  return getLocalStore<Test>(STORAGE_KEYS.TESTS);
}

export async function saveTest(test: Test): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('tests').upsert({
        id: test.id,
        title: test.title,
        description: test.description,
        duration_minutes: test.duration_minutes,
        total_marks: test.total_marks,
        eligible_years: test.eligible_years,
        eligible_departments: test.eligible_departments,
        start_time: test.start_time,
        end_time: test.end_time,
        status: test.status,
      });

      if (!error && test.questions?.length) {
        for (const tq of test.questions) {
          await supabase.from('test_questions').upsert({
            test_id: test.id,
            question_id: tq.question_id,
            order_index: tq.order_index,
            marks: tq.marks,
          });
        }
      }
      if (!error) return true;
    } catch (e) {
      console.warn('Supabase save test error:', e);
    }
  }

  const existing = getLocalStore<Test>(STORAGE_KEYS.TESTS);
  const updated = existing.filter((t) => t.id !== test.id);
  updated.unshift(test);
  setLocalStore(STORAGE_KEYS.TESTS, updated);
  return true;
}

// ==============================================================================
// 4. TEST ATTEMPTS & COMPLETION SERVICE
// ==============================================================================

export async function fetchAttempts(): Promise<TestAttempt[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('test_attempts')
        .select(`
          *,
          students (
            register_number,
            department,
            year,
            profiles (
              full_name,
              email
            )
          ),
          tests (
            title
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as TestAttempt[];
      }
    } catch (e) {
      console.warn('Failed to query Supabase attempts:', e);
    }
  }

  return getLocalStore<TestAttempt>(STORAGE_KEYS.ATTEMPTS);
}

export async function saveAttempt(attempt: TestAttempt): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('test_attempts').upsert({
        id: attempt.id,
        test_id: attempt.test_id,
        student_id: attempt.student_id,
        started_at: attempt.started_at,
        last_saved_at: attempt.last_saved_at,
        completed_at: attempt.completed_at,
        status: attempt.status,
        score: attempt.score,
        percentage: attempt.percentage,
        time_taken_seconds: attempt.time_taken_seconds,
        tab_switch_count: attempt.tab_switch_count,
        fullscreen_exit_count: attempt.fullscreen_exit_count,
        copy_paste_count: attempt.copy_paste_count,
        completion_rank: attempt.completion_rank,
        auto_submitted: attempt.auto_submitted,
      });
      if (!error) return true;
    } catch (e) {
      console.warn('Supabase save attempt error:', e);
    }
  }

  const existing = getLocalStore<TestAttempt>(STORAGE_KEYS.ATTEMPTS);
  const updated = existing.filter((a) => a.id !== attempt.id);
  updated.push(attempt);
  setLocalStore(STORAGE_KEYS.ATTEMPTS, updated);
  return true;
}

// ==============================================================================
// 5. ACTIVITY LOGS SERVICE
// ==============================================================================

export async function fetchActivityLogs(): Promise<ActivityLog[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as ActivityLog[];
      }
    } catch (e) {
      console.warn('Failed to query Supabase logs:', e);
    }
  }

  return getLocalStore<ActivityLog>(STORAGE_KEYS.LOGS);
}

export async function recordActivityLog(log: ActivityLog): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      await supabase.from('activity_logs').insert({
        id: log.id,
        attempt_id: log.attempt_id,
        student_id: log.student_id,
        event_type: log.event_type,
        details: log.details,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        created_at: log.created_at,
      });
      return true;
    } catch (e) {
      console.warn('Supabase record log error:', e);
    }
  }

  const existing = getLocalStore<ActivityLog>(STORAGE_KEYS.LOGS);
  existing.unshift(log);
  // Keep last 200 logs
  setLocalStore(STORAGE_KEYS.LOGS, existing.slice(0, 200));
  return true;
}
