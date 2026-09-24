// ==============================================================================
// JIT CodeArena - Core Institutional TypeScript Interfaces and Types
// ==============================================================================

export type UserRole = 'student' | 'admin' | 'invigilator';

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export type QuestionTopic =
  | 'Variables'
  | 'Conditions'
  | 'Loops'
  | 'Functions'
  | 'Strings'
  | 'Lists'
  | 'Tuples'
  | 'Dictionaries'
  | 'OOP'
  | 'Recursion'
  | 'DSA'
  | 'Algorithms';

export type TestStatus = 'draft' | 'published' | 'active' | 'ended';

export type AttemptStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'auto_submitted'
  | 'timed_out'
  | 'disqualified';

export type SubmissionStatus =
  | 'Accepted'
  | 'Wrong Answer'
  | 'Time Limit Exceeded'
  | 'Memory Limit Exceeded'
  | 'Compilation Error'
  | 'Runtime Error'
  | 'Internal Error';

export type ActivityEventType =
  | 'LOGIN'
  | 'TEST_STARTED'
  | 'QUESTION_VIEWED'
  | 'CODE_SAVED'
  | 'CODE_EXECUTED'
  | 'CODE_SUBMITTED'
  | 'TAB_SWITCH'
  | 'FULLSCREEN_EXIT'
  | 'COPY_ATTEMPT'
  | 'PASTE_ATTEMPT'
  | 'CUT_ATTEMPT'
  | 'SHORTCUT_ATTEMPT'
  | 'TEST_COMPLETED'
  | 'AUTO_SUBMISSION'
  | 'WARNING_TRIGGERED';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StudentProfile extends Profile {
  register_number: string;
  department: string; // CSE, IT, AI&DS, ECE, MECH, CIVIL, EEE, CSBS
  year: number; // 1, 2, 3, 4
  section?: string;
  phone?: string;
  status: 'active' | 'disabled' | 'suspended' | 'archived';
  is_active?: boolean;
  is_archived?: boolean;
  account_deleted?: boolean;
  session_version?: number;
}

export interface TestCase {
  id: string;
  question_id: string;
  input: string;
  expected_output: string;
  is_hidden: boolean;
  weight: number;
  explanation?: string;
}

export interface Question {
  id: string;
  title: string;
  slug: string;
  description: string;
  year: number; // 2 or 3 (Academic year pool)
  input_format: string;
  output_format: string;
  constraints: string;
  sample_explanation?: string;
  difficulty: DifficultyLevel;
  topic: QuestionTopic;
  starter_code: string;
  solution_code?: string;
  marks: number;
  time_limit_ms: number;
  memory_limit_kb: number;
  is_active: boolean;
  created_at?: string;
  test_cases?: TestCase[]; // Hidden cases stripped for student views
}

export interface TestQuestion {
  id: string;
  test_id: string;
  question_id: string;
  order_index: number;
  marks: number;
  question?: Question;
}

export interface AttemptQuestion {
  id: string;
  attempt_id: string;
  question_id: string;
  question_order: number;
  created_at: string;
  question?: Question;
}

export interface ScoringConfig {
  correctness: number;
  time_performance: number;
  code_quality: number;
  attempts: number;
}

export interface Test {
  id: string;
  title: string;
  description: string;
  year?: number; // 2 or 3 (Academic Year restriction)
  question_count?: number; // Configured number of questions to assign from pool
  duration_minutes: number;
  total_marks: number;
  eligible_years: number[];
  eligible_departments: string[];
  start_time: string;
  end_time: string;
  status: TestStatus;
  scoring_config?: ScoringConfig;
  questions?: TestQuestion[];
  created_at?: string;
}

export interface TestAttempt {
  id: string;
  test_id: string;
  student_id: string;
  started_at: string;
  last_saved_at: string;
  completed_at?: string | null;
  status: AttemptStatus;
  score: number;
  percentage: number;
  time_taken_seconds: number;
  tab_switch_count: number;
  fullscreen_exit_count: number;
  copy_paste_count: number;
  completion_rank?: number | null;
  auto_submitted: boolean;
  student?: StudentProfile;
  students?: any;
  test?: Test;
  tests?: any;
}

export interface StudentAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  saved_code: string;
  last_saved_at: string;
}

export interface TestCaseResult {
  test_case_id: string;
  is_hidden: boolean;
  passed: boolean;
  input?: string;
  expected_output?: string;
  actual_output?: string;
  execution_time_ms: number;
  memory_kb: number;
  error?: string;
}

export interface Submission {
  id: string;
  attempt_id: string;
  question_id: string;
  student_id: string;
  code: string;
  language: string;
  status: SubmissionStatus;
  test_cases_passed: number;
  total_test_cases: number;
  score: number;
  execution_time_ms: number;
  memory_kb: number;
  stdout?: string;
  stderr?: string;
  compile_output?: string;
  details?: {
    test_case_results: TestCaseResult[];
    score_breakdown?: {
      correctness_score: number;
      time_score: number;
      quality_score: number;
      attempts_penalty: number;
      final_marks: number;
    };
  };
  created_at: string;
}

export interface ActivityLog {
  id: string;
  attempt_id?: string;
  student_id: string;
  event_type: ActivityEventType;
  details: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  student?: StudentProfile;
  profiles?: any;
}

export interface LeaderboardEntry {
  rank: number;
  completion_order: number;
  student_name: string;
  register_number: string;
  department: string;
  year: number;
  score: number;
  percentage: number;
  time_taken_seconds: number;
  completed_at: string;
  status: AttemptStatus;
  tab_switch_count: number;
  fullscreen_exit_count: number;
}

export interface LiveMonitorStudent {
  id: string;
  attempt_id?: string;
  student_name: string;
  register_number: string;
  department: string;
  year: number;
  test_title: string;
  progress: string;
  current_score: number;
  started_time: string;
  elapsed_time_seconds: number;
  status: 'active' | 'warning' | 'suspicious' | 'completed' | 'not_started';
  warnings_count: number;
  completion_time?: string;
  tab_switches: number;
  fullscreen_exits: number;
  copy_pastes: number;
  current_question_index: number;
  total_submissions: number;
  recent_logs: ActivityLog[];
}
