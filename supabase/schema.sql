-- ==============================================================================
-- JIT CodeArena - Database Schema & Supabase Configuration
-- College-specific Python Coding Assessment Platform
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

-- 2. STUDENTS (College specific details for 2nd & 3rd year students)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    register_number TEXT NOT NULL UNIQUE,
    department TEXT NOT NULL, -- e.g., 'CSE', 'IT', 'AI&DS', 'ECE'
    year INTEGER NOT NULL CHECK (year IN (1, 2, 3, 4)),
    section TEXT DEFAULT 'A',
    phone TEXT,
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

-- ==============================================================================
-- INITIAL SEED DATA (College Departments, Real Questions, Test Cases)
-- ==============================================================================

-- Sample Question 1: Two Sum
INSERT INTO public.questions (id, title, slug, description, input_format, output_format, constraints, sample_explanation, difficulty, topic, starter_code, marks, time_limit_ms, memory_limit_kb)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Two Sum',
    'two-sum',
    'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer with indices separated by space, or as a list in ascending order.',
    'First line contains space-separated integers representing nums.\nSecond line contains integer target.',
    'Space-separated indices i and j (0-indexed) where nums[i] + nums[j] == target.',
    '2 <= len(nums) <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9',
    'nums = [2, 7, 11, 15], target = 9.\nBecause nums[0] + nums[1] == 9, we return 0 1.',
    'Easy',
    'Lists',
    'def two_sum(nums, target):\n    # Write your solution here\n    hashmap = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in hashmap:\n            return f"{hashmap[diff]} {i}"\n        hashmap[num] = i\n    return ""\n\nif __name__ == "__main__":\n    import sys\n    lines = sys.stdin.read().strip().splitlines()\n    if lines:\n        nums = list(map(int, lines[0].split()))\n        target = int(lines[1])\n        print(two_sum(nums, target))\n',
    25,
    2000,
    128000
) ON CONFLICT (id) DO NOTHING;

-- Test cases for Question 1
INSERT INTO public.test_cases (question_id, input, expected_output, is_hidden, weight)
VALUES
    ('11111111-1111-1111-1111-111111111111', '2 7 11 15\n9', '0 1', FALSE, 1),
    ('11111111-1111-1111-1111-111111111111', '3 2 4\n6', '1 2', FALSE, 1),
    ('11111111-1111-1111-1111-111111111111', '3 3\n6', '0 1', TRUE, 1),
    ('11111111-1111-1111-1111-111111111111', '-1 -2 -3 -4 -5\n-8', '2 4', TRUE, 1),
    ('11111111-1111-1111-1111-111111111111', '10 25 30 45 60 75\n105', '3 4', TRUE, 1)
ON CONFLICT DO NOTHING;

-- Sample Question 2: Valid Parentheses
INSERT INTO public.questions (id, title, slug, description, input_format, output_format, constraints, sample_explanation, difficulty, topic, starter_code, marks, time_limit_ms, memory_limit_kb)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'Valid Parentheses',
    'valid-parentheses',
    'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.',
    'A single string s.',
    'Print "true" if the string is valid, otherwise "false".',
    '1 <= len(s) <= 10^4\ns consists of parentheses only: ()[]{}',
    'Input "()[]{}" -> true\nInput "(]" -> false',
    'Easy',
    'DSA',
    'def is_valid(s):\n    stack = []\n    mapping = {")": "(", "}": "{", "]": "["}\n    for char in s:\n        if char in mapping:\n            top = stack.pop() if stack else "#"\n            if mapping[char] != top:\n                return "false"\n        else:\n            stack.append(char)\n    return "true" if not stack else "false"\n\nif __name__ == "__main__":\n    import sys\n    s = sys.stdin.read().strip()\n    print(is_valid(s))\n',
    25,
    2000,
    128000
) ON CONFLICT (id) DO NOTHING;

-- Test cases for Question 2
INSERT INTO public.test_cases (question_id, input, expected_output, is_hidden, weight)
VALUES
    ('22222222-2222-2222-2222-222222222222', '()', 'true', FALSE, 1),
    ('22222222-2222-2222-2222-222222222222', '()[]{}', 'true', FALSE, 1),
    ('22222222-2222-2222-2222-222222222222', '(]', 'false', FALSE, 1),
    ('22222222-2222-2222-2222-222222222222', '([)]', 'false', TRUE, 1),
    ('22222222-2222-2222-2222-222222222222', '{[]}', 'true', TRUE, 1),
    ('22222222-2222-2222-2222-222222222222', '((((({{{[[[]]]}}})))))', 'true', TRUE, 1)
ON CONFLICT DO NOTHING;

-- Sample Question 3: Longest Palindromic Substring Length
INSERT INTO public.questions (id, title, slug, description, input_format, output_format, constraints, sample_explanation, difficulty, topic, starter_code, marks, time_limit_ms, memory_limit_kb)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    'Longest Palindrome Length',
    'longest-palindrome-length',
    'Given a string `s`, find the length of the longest palindromic substring in `s`.\n\nA palindrome is a string that reads the same backward as forward.',
    'A single string s.',
    'An integer denoting the length of the longest palindromic substring.',
    '1 <= len(s) <= 1000\ns consists of lowercase English letters only.',
    'Input "babad" -> longest palindromic substring is "bab" or "aba", length = 3.',
    'Medium',
    'Strings',
    'def longest_palindrome_length(s):\n    if not s:\n        return 0\n    max_len = 1\n    for i in range(len(s)):\n        # Odd length palindrome\n        l, r = i, i\n        while l >= 0 and r < len(s) and s[l] == s[r]:\n            max_len = max(max_len, r - l + 1)\n            l -= 1\n            r += 1\n        # Even length palindrome\n        l, r = i, i + 1\n        while l >= 0 and r < len(s) and s[l] == s[r]:\n            max_len = max(max_len, r - l + 1)\n            l -= 1\n            r += 1\n    return max_len\n\nif __name__ == "__main__":\n    import sys\n    s = sys.stdin.read().strip()\n    print(longest_palindrome_length(s))\n',
    25,
    2000,
    128000
) ON CONFLICT (id) DO NOTHING;

-- Test cases for Question 3
INSERT INTO public.test_cases (question_id, input, expected_output, is_hidden, weight)
VALUES
    ('33333333-3333-3333-3333-333333333333', 'babad', '3', FALSE, 1),
    ('33333333-3333-3333-3333-333333333333', 'cbbd', '2', FALSE, 1),
    ('33333333-3333-3333-3333-333333333333', 'racecar', '7', TRUE, 1),
    ('33333333-3333-3333-3333-333333333333', 'aaaaa', '5', TRUE, 1),
    ('33333333-3333-3333-3333-333333333333', 'abacdfgdcaba', '3', TRUE, 1)
ON CONFLICT DO NOTHING;

-- Sample Question 4: Maximum Subarray Sum (Kadane algorithm)
INSERT INTO public.questions (id, title, slug, description, input_format, output_format, constraints, sample_explanation, difficulty, topic, starter_code, marks, time_limit_ms, memory_limit_kb)
VALUES (
    '44444444-4444-4444-4444-444444444444',
    'Maximum Subarray Sum',
    'max-subarray-sum',
    'Given an integer array `nums`, find the subarray with the largest sum, and return its sum.\n\nA subarray is a contiguous non-empty sequence of elements within an array.',
    'A single line containing space-separated integers.',
    'An integer representing the maximum subarray sum.',
    '1 <= len(nums) <= 10^5\n-10^4 <= nums[i] <= 10^4',
    'nums = [-2,1,-3,4,-1,2,1,-5,4]\nThe subarray [4,-1,2,1] has the largest sum 6.',
    'Medium',
    'Algorithms',
    'def max_subarray(nums):\n    max_so_far = nums[0]\n    current_max = nums[0]\n    for num in nums[1:]:\n        current_max = max(num, current_max + num)\n        max_so_far = max(max_so_far, current_max)\n    return max_so_far\n\nif __name__ == "__main__":\n    import sys\n    raw = sys.stdin.read().strip()\n    if raw:\n        nums = list(map(int, raw.split()))\n        print(max_subarray(nums))\n',
    25,
    2000,
    128000
) ON CONFLICT (id) DO NOTHING;

-- Test cases for Question 4
INSERT INTO public.test_cases (question_id, input, expected_output, is_hidden, weight)
VALUES
    ('44444444-4444-4444-4444-444444444444', '-2 1 -3 4 -1 2 1 -5 4', '6', FALSE, 1),
    ('44444444-4444-4444-4444-444444444444', '1', '1', FALSE, 1),
    ('44444444-4444-4444-4444-444444444444', '5 4 -1 7 8', '23', TRUE, 1),
    ('44444444-4444-4444-4444-444444444444', '-5 -2 -8 -1', '-1', TRUE, 1)
ON CONFLICT DO NOTHING;

-- Sample Test: JIT Python Coding Assessment 2026
INSERT INTO public.tests (id, title, description, duration_minutes, total_marks, eligible_years, eligible_departments, start_time, end_time, status)
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'JIT Python Proficiency Assessment 2026',
    'Mandatory Python Assessment for 2nd and 3rd year engineering students (CSE, IT, AI&DS, ECE). Solve 4 algorithmic challenges within 60 minutes.',
    60,
    100,
    '{2, 3}',
    '{"CSE", "IT", "AI&DS", "ECE"}',
    NOW() - INTERVAL '1 hour',
    NOW() + INTERVAL '7 days',
    'active'
) ON CONFLICT (id) DO NOTHING;

-- Link Questions to Test
INSERT INTO public.test_questions (test_id, question_id, order_index, marks)
VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 1, 25),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 2, 25),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 3, 25),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 4, 25)
ON CONFLICT DO NOTHING;
