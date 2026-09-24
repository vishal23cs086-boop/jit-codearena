-- ==============================================================================
-- JIT CodeArena - Database Schema & Supabase Configuration
-- Institutional Online Coding Assessment Platform
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'admin', 'invigilator')) DEFAULT 'student',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. STUDENTS (College specific details for candidates)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    register_number TEXT NOT NULL UNIQUE,
    department TEXT NOT NULL, -- e.g., 'CSE', 'IT', 'AI&DS', 'ECE', 'MECH', 'CIVIL', 'EEE', 'CSBS'
    year INTEGER NOT NULL CHECK (year IN (1, 2, 3, 4)),
    section TEXT DEFAULT 'A',
    phone TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'disabled', 'suspended')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. QUESTIONS (Question Bank)
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    input_format TEXT NOT NULL,
    output_format TEXT NOT NULL,
    constraints TEXT NOT NULL,
    sample_explanation TEXT,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')) DEFAULT 'Easy',
    topic TEXT NOT NULL CHECK (topic IN (
        'Variables', 'Conditions', 'Loops', 'Functions', 'Strings', 
        'Lists', 'Tuples', 'Dictionaries', 'OOP', 'Recursion', 'DSA', 'Algorithms'
    )),
    starter_code TEXT NOT NULL DEFAULT 'def solution():\n    # Write your Python code here\n    pass\n',
    solution_code TEXT,
    marks INTEGER NOT NULL DEFAULT 100,
    time_limit_ms INTEGER NOT NULL DEFAULT 2000, -- 2 seconds
    memory_limit_kb INTEGER NOT NULL DEFAULT 128000, -- 128MB
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TEST CASES (Public sample & hidden test cases)
CREATE TABLE IF NOT EXISTS public.test_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    input TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    weight INTEGER NOT NULL DEFAULT 1,
    explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TESTS (Examinations / Assessments)
CREATE TABLE IF NOT EXISTS public.tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    total_marks INTEGER NOT NULL DEFAULT 100,
    eligible_years INTEGER[] DEFAULT '{2,3}',
    eligible_departments TEXT[] DEFAULT '{"CSE","IT","AI&DS","ECE"}',
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'active', 'ended')) DEFAULT 'draft',
    scoring_config JSONB DEFAULT '{"correctness": 70, "time_performance": 15, "code_quality": 10, "attempts": 5}',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TEST QUESTIONS (Join table for tests and questions with custom ordering & marks)
CREATE TABLE IF NOT EXISTS public.test_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL DEFAULT 1,
    marks INTEGER NOT NULL DEFAULT 100,
    UNIQUE(test_id, question_id)
);

-- 7. TEST ATTEMPTS (Student session for a test)
CREATE TABLE IF NOT EXISTS public.test_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL CHECK (status IN ('in_progress', 'submitted', 'auto_submitted', 'timed_out', 'disqualified')) DEFAULT 'in_progress',
    score NUMERIC(5, 2) DEFAULT 0.00,
    percentage NUMERIC(5, 2) DEFAULT 0.00,
    time_taken_seconds INTEGER DEFAULT 0,
    tab_switch_count INTEGER DEFAULT 0,
    fullscreen_exit_count INTEGER DEFAULT 0,
    copy_paste_count INTEGER DEFAULT 0,
    completion_rank INTEGER,
    auto_submitted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(test_id, student_id)
);

-- 8. STUDENT ANSWERS (Auto-saved code drafts per question during test)
CREATE TABLE IF NOT EXISTS public.student_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    saved_code TEXT NOT NULL,
    last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(attempt_id, question_id)
);

-- 9. SUBMISSIONS (Evaluated code runs against test cases)
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'python',
    status TEXT NOT NULL CHECK (status IN ('Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Memory Limit Exceeded', 'Compilation Error', 'Runtime Error', 'Internal Error')),
    test_cases_passed INTEGER NOT NULL DEFAULT 0,
    total_test_cases INTEGER NOT NULL DEFAULT 0,
    score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    execution_time_ms INTEGER DEFAULT 0,
    memory_kb INTEGER DEFAULT 0,
    stdout TEXT,
    stderr TEXT,
    compile_output TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. ACTIVITY LOGS (Anti-cheating audit trail)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID REFERENCES public.test_attempts(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'LOGIN', 'TEST_STARTED', 'QUESTION_VIEWED', 'CODE_SAVED', 
        'CODE_EXECUTED', 'CODE_SUBMITTED', 'TAB_SWITCH', 'FULLSCREEN_EXIT', 
        'COPY_ATTEMPT', 'PASTE_ATTEMPT', 'CUT_ATTEMPT', 'SHORTCUT_ATTEMPT',
        'TEST_COMPLETED', 'AUTO_SUBMISSION', 'WARNING_TRIGGERED'
    )),
    details JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_students_reg ON public.students(register_number);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON public.questions(topic);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_test_cases_qid ON public.test_cases(question_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_hidden ON public.test_cases(question_id, is_hidden);
CREATE INDEX IF NOT EXISTS idx_test_questions_test ON public.test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_test ON public.test_attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_student ON public.test_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_status ON public.test_attempts(status);
CREATE INDEX IF NOT EXISTS idx_test_attempts_completion_rank ON public.test_attempts(completion_rank);
CREATE INDEX IF NOT EXISTS idx_submissions_attempt ON public.submissions(attempt_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_attempt ON public.activity_logs(attempt_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_student ON public.activity_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_event ON public.activity_logs(event_type);

-- ==============================================================================
-- TRIGGER FOR FIRST COMPLETION TRACKING (Server-side completion rank)
-- ==============================================================================
CREATE OR REPLACE FUNCTION set_completion_rank()
RETURNS TRIGGER AS $$
DECLARE
    next_rank INTEGER;
BEGIN
    IF (NEW.status IN ('submitted', 'auto_submitted') AND OLD.status = 'in_progress') THEN
        NEW.completed_at := NOW();
        NEW.time_taken_seconds := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at))::INTEGER;
        
        -- Compute rank among completed submissions for this test
        SELECT COALESCE(MAX(completion_rank), 0) + 1 INTO next_rank
        FROM public.test_attempts
        WHERE test_id = NEW.test_id AND completion_rank IS NOT NULL;
        
        NEW.completion_rank := next_rank;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_test_completion_rank ON public.test_attempts;
CREATE TRIGGER trg_test_completion_rank
BEFORE UPDATE ON public.test_attempts
FOR EACH ROW
EXECUTE FUNCTION set_completion_rank();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper to check if current auth user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Users can view all, but only edit own; Admin full access
CREATE POLICY "Profiles readable by authenticated users" ON public.profiles
    FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Students: Read by auth, admin full manage
CREATE POLICY "Students readable by authenticated" ON public.students
    FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Admin can manage students" ON public.students
    FOR ALL TO authenticated USING (public.is_admin());

-- Questions: Active questions readable by authenticated; Admin full access
CREATE POLICY "Active questions readable by students" ON public.questions
    FOR SELECT TO authenticated USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "Admin can manage questions" ON public.questions
    FOR ALL TO authenticated USING (public.is_admin());

-- Test Cases: CRITICAL SECURITY RULE:
-- Students can ONLY view public test cases (is_hidden = FALSE)
CREATE POLICY "Students can only read public test cases" ON public.test_cases
    FOR SELECT TO authenticated USING (is_hidden = FALSE OR public.is_admin());

CREATE POLICY "Admin can manage test cases" ON public.test_cases
    FOR ALL TO authenticated USING (public.is_admin());

-- Tests: Published or active tests readable by students; Admin full access
CREATE POLICY "Published tests readable by authenticated" ON public.tests
    FOR SELECT TO authenticated USING (status IN ('published', 'active', 'ended') OR public.is_admin());

CREATE POLICY "Admin can manage tests" ON public.tests
    FOR ALL TO authenticated USING (public.is_admin());

-- Test Questions: Readable by authenticated; Admin full access
CREATE POLICY "Test questions readable by authenticated" ON public.test_questions
    FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Admin can manage test questions" ON public.test_questions
    FOR ALL TO authenticated USING (public.is_admin());

-- Test Attempts: Students view & update own; Admin views all
CREATE POLICY "Students can view own attempts" ON public.test_attempts
    FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.is_admin());

CREATE POLICY "Students can insert own attempts" ON public.test_attempts
    FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update own attempts" ON public.test_attempts
    FOR UPDATE TO authenticated USING (student_id = auth.uid() OR public.is_admin());

-- Student Answers: Students can manage own draft code
CREATE POLICY "Students can manage own saved answers" ON public.student_answers
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.test_attempts 
            WHERE id = attempt_id AND student_id = auth.uid()
        ) OR public.is_admin()
    );

-- Submissions: Students view own; Service role/server inserts
CREATE POLICY "Students can view own submissions" ON public.submissions
    FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.is_admin());

CREATE POLICY "Students can insert own submissions" ON public.submissions
    FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid() OR public.is_admin());

-- Activity Logs: Students insert logs, view own; Admin views all
CREATE POLICY "Students can insert activity logs" ON public.activity_logs
    FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

CREATE POLICY "Users can view own activity logs" ON public.activity_logs
    FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.is_admin());
