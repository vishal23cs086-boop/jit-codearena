import { Question, Test, StudentProfile, TestAttempt, ActivityLog, LiveMonitorStudent } from '@/types';

export const MOCK_STUDENTS: StudentProfile[] = [
  {
    id: 's1-harish',
    email: 'harish.22cs084@jit.edu.in',
    full_name: 'Harish Kumar S',
    role: 'student',
    register_number: '22CS084',
    department: 'CSE',
    year: 3,
    section: 'A',
    phone: '+91 98401 23456',
  },
  {
    id: 's2-priya',
    email: 'priya.23it045@jit.edu.in',
    full_name: 'Priya Sundaram',
    role: 'student',
    register_number: '23IT045',
    department: 'IT',
    year: 2,
    section: 'B',
    phone: '+91 98402 34567',
  },
  {
    id: 's3-vignesh',
    email: 'vignesh.22ad012@jit.edu.in',
    full_name: 'Vignesh Raman',
    role: 'student',
    register_number: '22AD012',
    department: 'AI&DS',
    year: 3,
    section: 'A',
    phone: '+91 98403 45678',
  },
  {
    id: 's4-ananya',
    email: 'ananya.23ec031@jit.edu.in',
    full_name: 'Ananya Meenakshi',
    role: 'student',
    register_number: '23EC031',
    department: 'ECE',
    year: 2,
    section: 'A',
    phone: '+91 98404 56789',
  },
  {
    id: 's5-karthik',
    email: 'karthik.22cs102@jit.edu.in',
    full_name: 'Karthikeyan P',
    role: 'student',
    register_number: '22CS102',
    department: 'CSE',
    year: 3,
    section: 'B',
    phone: '+91 98405 67890',
  },
];

export const MOCK_ADMIN: StudentProfile = {
  id: 'admin-prof-dr-murugan',
  email: 'hod.cse@jit.edu.in',
  full_name: 'Dr. M. Murugan (HOD / Exam Coordinator)',
  role: 'admin',
  register_number: 'FAC-CSE-01',
  department: 'CSE',
  year: 4,
};

export const MOCK_QUESTIONS: Question[] = [
  {
    id: 'q1-two-sum',
    title: 'Two Sum',
    slug: 'two-sum',
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

Output the two indices separated by a single space (e.g. \`0 1\`).`,
    input_format: `Line 1: Space-separated integers representing nums
Line 2: Single integer representing target`,
    output_format: `Two space-separated indices in ascending order (0-indexed).`,
    constraints: `2 <= len(nums) <= 10^4
-10^9 <= nums[i] <= 10^9
-10^9 <= target <= 10^9`,
    sample_explanation: `Input:
2 7 11 15
9

Output:
0 1

Explanation: nums[0] + nums[1] == 2 + 7 == 9, so we print 0 1.`,
    difficulty: 'Easy',
    topic: 'Lists',
    starter_code: `def two_sum(nums, target):
    # Write your logic here
    # Return two space separated indices
    pass

if __name__ == "__main__":
    import sys
    lines = sys.stdin.read().strip().splitlines()
    if lines:
        nums = list(map(int, lines[0].split()))
        target = int(lines[1])
        print(two_sum(nums, target))
`,
    marks: 25,
    time_limit_ms: 2000,
    memory_limit_kb: 128000,
    is_active: true,
    test_cases: [
      {
        id: 'tc1-1',
        question_id: 'q1-two-sum',
        input: '2 7 11 15\n9',
        expected_output: '0 1',
        is_hidden: false,
        weight: 1,
        explanation: 'Basic example: 2 + 7 = 9',
      },
      {
        id: 'tc1-2',
        question_id: 'q1-two-sum',
        input: '3 2 4\n6',
        expected_output: '1 2',
        is_hidden: false,
        weight: 1,
        explanation: '2 + 4 = 6',
      },
      {
        id: 'tc1-3',
        question_id: 'q1-two-sum',
        input: '3 3\n6',
        expected_output: '0 1',
        is_hidden: true,
        weight: 1,
      },
      {
        id: 'tc1-4',
        question_id: 'q1-two-sum',
        input: '-1 -2 -3 -4 -5\n-8',
        expected_output: '2 4',
        is_hidden: true,
        weight: 1,
      },
      {
        id: 'tc1-5',
        question_id: 'q1-two-sum',
        input: '10 25 30 45 60 75\n105',
        expected_output: '3 4',
        is_hidden: true,
        weight: 1,
      },
    ],
  },
  {
    id: 'q2-valid-parentheses',
    title: 'Valid Parentheses',
    slug: 'valid-parentheses',
    description: `Given a string \`s\` containing just the characters \`(\`, \`)\`, \`{\`, \`}\`, \`[\` and \`]\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    input_format: `A single line containing string s.`,
    output_format: `Print "true" if the bracket string is valid, or "false" if invalid.`,
    constraints: `1 <= len(s) <= 10^4
s consists of parentheses only: ()[]{}`,
    sample_explanation: `Input: ()[]{}
Output: true

Input: (]
Output: false`,
    difficulty: 'Easy',
    topic: 'DSA',
    starter_code: `def is_valid(s):
    # Implement stack solution
    pass

if __name__ == "__main__":
    import sys
    s = sys.stdin.read().strip()
    print(is_valid(s))
`,
    marks: 25,
    time_limit_ms: 2000,
    memory_limit_kb: 128000,
    is_active: true,
    test_cases: [
      {
        id: 'tc2-1',
        question_id: 'q2-valid-parentheses',
        input: '()',
        expected_output: 'true',
        is_hidden: false,
        weight: 1,
      },
      {
        id: 'tc2-2',
        question_id: 'q2-valid-parentheses',
        input: '()[]{}',
        expected_output: 'true',
        is_hidden: false,
        weight: 1,
      },
      {
        id: 'tc2-3',
        question_id: 'q2-valid-parentheses',
        input: '(]',
        expected_output: 'false',
        is_hidden: false,
        weight: 1,
      },
      {
        id: 'tc2-4',
        question_id: 'q2-valid-parentheses',
        input: '([)]',
        expected_output: 'false',
        is_hidden: true,
        weight: 1,
      },
      {
        id: 'tc2-5',
        question_id: 'q2-valid-parentheses',
        input: '{[]}',
        expected_output: 'true',
        is_hidden: true,
        weight: 1,
      },
    ],
  },
  {
    id: 'q3-longest-palindrome',
    title: 'Longest Palindrome Substring Length',
    slug: 'longest-palindrome-length',
    description: `Given a string \`s\`, return the length of the longest palindromic substring in \`s\`.

A palindromic string reads the same forwards and backwards (e.g. \`racecar\` or \`aba\`).`,
    input_format: `A single string s on one line.`,
    output_format: `A single integer representing the length of the longest palindrome substring.`,
    constraints: `1 <= len(s) <= 1000
s consists of lowercase English letters.`,
    sample_explanation: `Input: babad
Output: 3
Explanation: "bab" or "aba" is a valid answer with length 3.`,
    difficulty: 'Medium',
    topic: 'Strings',
    starter_code: `def longest_palindrome_length(s):
    # Find longest palindrome substring length
    pass

if __name__ == "__main__":
    import sys
    s = sys.stdin.read().strip()
    print(longest_palindrome_length(s))
`,
    marks: 25,
    time_limit_ms: 2000,
    memory_limit_kb: 128000,
    is_active: true,
    test_cases: [
      {
        id: 'tc3-1',
        question_id: 'q3-longest-palindrome',
        input: 'babad',
        expected_output: '3',
        is_hidden: false,
        weight: 1,
      },
      {
        id: 'tc3-2',
        question_id: 'q3-longest-palindrome',
        input: 'cbbd',
        expected_output: '2',
        is_hidden: false,
        weight: 1,
      },
      {
        id: 'tc3-3',
        question_id: 'q3-longest-palindrome',
        input: 'racecar',
        expected_output: '7',
        is_hidden: true,
        weight: 1,
      },
      {
        id: 'tc3-4',
        question_id: 'q3-longest-palindrome',
        input: 'aaaaa',
        expected_output: '5',
        is_hidden: true,
        weight: 1,
      },
    ],
  },
  {
    id: 'q4-max-subarray',
    title: 'Maximum Subarray Sum',
    slug: 'max-subarray-sum',
    description: `Given an integer array \`nums\`, find the subarray with the largest sum, and return its sum (Kadane's Algorithm).

A subarray is a contiguous non-empty sequence of elements within an array.`,
    input_format: `A single line of space-separated integers.`,
    output_format: `A single integer denoting the maximum sum.`,
    constraints: `1 <= len(nums) <= 10^5
-10^4 <= nums[i] <= 10^4`,
    sample_explanation: `Input: -2 1 -3 4 -1 2 1 -5 4
Output: 6
Explanation: The subarray [4, -1, 2, 1] has the largest sum = 6.`,
    difficulty: 'Medium',
    topic: 'Algorithms',
    starter_code: `def max_subarray(nums):
    # Implement Kadane algorithm
    pass

if __name__ == "__main__":
    import sys
    raw = sys.stdin.read().strip()
    if raw:
        nums = list(map(int, raw.split()))
        print(max_subarray(nums))
`,
    marks: 25,
    time_limit_ms: 2000,
    memory_limit_kb: 128000,
    is_active: true,
    test_cases: [
      {
        id: 'tc4-1',
        question_id: 'q4-max-subarray',
        input: '-2 1 -3 4 -1 2 1 -5 4',
        expected_output: '6',
        is_hidden: false,
        weight: 1,
      },
      {
        id: 'tc4-2',
        question_id: 'q4-max-subarray',
        input: '1',
        expected_output: '1',
        is_hidden: false,
        weight: 1,
      },
      {
        id: 'tc4-3',
        question_id: 'q4-max-subarray',
        input: '5 4 -1 7 8',
        expected_output: '23',
        is_hidden: true,
        weight: 1,
      },
      {
        id: 'tc4-4',
        question_id: 'q4-max-subarray',
        input: '-5 -2 -8 -1',
        expected_output: '-1',
        is_hidden: true,
        weight: 1,
      },
    ],
  },
];

export const MOCK_TESTS: Test[] = [
  {
    id: 'test-jit-py-2026',
    title: 'JIT Python Assessment 2026 - Cycle 1',
    description:
      'Official Departmental Coding Assessment for 2nd and 3rd year engineering students (CSE, IT, AI&DS, ECE). Covers Lists, Stack DSA, String Manipulation, and Dynamic Programming / Greedy Algorithms.',
    duration_minutes: 60,
    total_marks: 100,
    eligible_years: [2, 3],
    eligible_departments: ['CSE', 'IT', 'AI&DS', 'ECE'],
    start_time: new Date(Date.now() - 3600000).toISOString(),
    end_time: new Date(Date.now() + 86400000 * 7).toISOString(),
    status: 'active',
    scoring_config: {
      correctness: 70,
      time_performance: 15,
      code_quality: 10,
      attempts: 5,
    },
    questions: MOCK_QUESTIONS.map((q, idx) => ({
      id: `tq-${q.id}`,
      test_id: 'test-jit-py-2026',
      question_id: q.id,
      order_index: idx + 1,
      marks: q.marks,
      question: q,
    })),
  },
  {
    id: 'test-jit-dsa-upcoming',
    title: 'JIT Data Structures & Python OOP Test',
    description:
      'Mid-semester assessment on Trees, Graphs, Object-Oriented Programming, and Custom Classes in Python.',
    duration_minutes: 90,
    total_marks: 100,
    eligible_years: [2, 3],
    eligible_departments: ['CSE', 'IT', 'AI&DS'],
    start_time: new Date(Date.now() + 86400000 * 2).toISOString(),
    end_time: new Date(Date.now() + 86400000 * 5).toISOString(),
    status: 'published',
  },
];

export const MOCK_LIVE_MONITOR: LiveMonitorStudent[] = [
  {
    id: 's1-harish',
    attempt_id: 'att-1',
    student_name: 'Harish Kumar S',
    register_number: '22CS084',
    department: 'CSE',
    year: 3,
    test_title: 'JIT Python Assessment 2026 - Cycle 1',
    progress: '4/4 Solved',
    current_score: 96.5,
    started_time: '10:02 AM',
    elapsed_time_seconds: 2040,
    status: 'completed',
    warnings_count: 0,
    completion_time: '10:36 AM',
    tab_switches: 0,
    fullscreen_exits: 0,
    copy_pastes: 0,
    current_question_index: 4,
    total_submissions: 5,
    recent_logs: [
      {
        id: 'l1',
        student_id: 's1-harish',
        event_type: 'TEST_COMPLETED',
        details: { score: 96.5, rank: 1 },
        created_at: '10:36:12 AM',
      },
      {
        id: 'l2',
        student_id: 's1-harish',
        event_type: 'CODE_SUBMITTED',
        details: { question: 'Maximum Subarray Sum', status: 'Accepted' },
        created_at: '10:34:00 AM',
      },
    ],
  },
  {
    id: 's2-priya',
    attempt_id: 'att-2',
    student_name: 'Priya Sundaram',
    register_number: '23IT045',
    department: 'IT',
    year: 2,
    test_title: 'JIT Python Assessment 2026 - Cycle 1',
    progress: '3/4 Solved',
    current_score: 72.0,
    started_time: '10:05 AM',
    elapsed_time_seconds: 2200,
    status: 'active',
    warnings_count: 1,
    tab_switches: 1,
    fullscreen_exits: 0,
    copy_pastes: 0,
    current_question_index: 4,
    total_submissions: 6,
    recent_logs: [
      {
        id: 'l3',
        student_id: 's2-priya',
        event_type: 'TAB_SWITCH',
        details: { reason: 'User switched window' },
        created_at: '10:28:15 AM',
      },
      {
        id: 'l4',
        student_id: 's2-priya',
        event_type: 'CODE_SUBMITTED',
        details: { question: 'Longest Palindrome', status: 'Accepted' },
        created_at: '10:25:40 AM',
      },
    ],
  },
  {
    id: 's3-vignesh',
    attempt_id: 'att-3',
    student_name: 'Vignesh Raman',
    register_number: '22AD012',
    department: 'AI&DS',
    year: 3,
    test_title: 'JIT Python Assessment 2026 - Cycle 1',
    progress: '2/4 Solved',
    current_score: 48.0,
    started_time: '10:08 AM',
    elapsed_time_seconds: 2400,
    status: 'suspicious',
    warnings_count: 4,
    tab_switches: 3,
    fullscreen_exits: 2,
    copy_pastes: 2,
    current_question_index: 3,
    total_submissions: 4,
    recent_logs: [
      {
        id: 'l5',
        student_id: 's3-vignesh',
        event_type: 'FULLSCREEN_EXIT',
        details: { reason: 'Esc key or window resize' },
        created_at: '10:32:04 AM',
      },
      {
        id: 'l6',
        student_id: 's3-vignesh',
        event_type: 'PASTE_ATTEMPT',
        details: { blocked: true },
        created_at: '10:30:11 AM',
      },
    ],
  },
  {
    id: 's4-ananya',
    attempt_id: 'att-4',
    student_name: 'Ananya Meenakshi',
    register_number: '23EC031',
    department: 'ECE',
    year: 2,
    test_title: 'JIT Python Assessment 2026 - Cycle 1',
    progress: '4/4 Solved',
    current_score: 92.0,
    started_time: '10:01 AM',
    elapsed_time_seconds: 2280,
    status: 'completed',
    warnings_count: 0,
    completion_time: '10:39 AM',
    tab_switches: 0,
    fullscreen_exits: 0,
    copy_pastes: 0,
    current_question_index: 4,
    total_submissions: 5,
    recent_logs: [
      {
        id: 'l7',
        student_id: 's4-ananya',
        event_type: 'TEST_COMPLETED',
        details: { score: 92.0, rank: 2 },
        created_at: '10:39:20 AM',
      },
    ],
  },
  {
    id: 's5-karthik',
    attempt_id: 'att-5',
    student_name: 'Karthikeyan P',
    register_number: '22CS102',
    department: 'CSE',
    year: 3,
    test_title: 'JIT Python Assessment 2026 - Cycle 1',
    progress: '0/4 Solved',
    current_score: 0.0,
    started_time: '-',
    elapsed_time_seconds: 0,
    status: 'not_started',
    warnings_count: 0,
    tab_switches: 0,
    fullscreen_exits: 0,
    copy_pastes: 0,
    current_question_index: 0,
    total_submissions: 0,
    recent_logs: [],
  },
];
