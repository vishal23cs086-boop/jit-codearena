const { createClient } = require('@libsql/client');

async function main() {
  const client = createClient({
    url: 'file:jit_codearena_local.db',
  });

  console.log('Connecting to database...');

  // 1. Tables creation
  const tables = [
    `CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      register_number TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      department TEXT NOT NULL,
      year INTEGER NOT NULL,
      section TEXT DEFAULT 'A',
      phone TEXT,
      password_hash TEXT,
      status TEXT DEFAULT 'active',
      is_archived INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS student_presence (
      student_id TEXT PRIMARY KEY,
      register_number TEXT NOT NULL,
      full_name TEXT NOT NULL,
      department TEXT NOT NULL,
      year INTEGER NOT NULL,
      section TEXT DEFAULT 'A',
      current_page TEXT,
      active_assessment_id TEXT,
      current_question_index INTEGER DEFAULT 0,
      total_questions INTEGER DEFAULT 0,
      violation_count INTEGER DEFAULT 0,
      session_status TEXT DEFAULT 'ONLINE',
      last_seen INTEGER NOT NULL,
      started_at INTEGER,
      user_agent TEXT,
      ip_address TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS tests (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      duration INTEGER NOT NULL,
      total_marks INTEGER NOT NULL,
      year INTEGER NOT NULL DEFAULT 2,
      question_count INTEGER DEFAULT 0,
      pass_marks INTEGER DEFAULT 50,
      is_active INTEGER DEFAULT 1,
      start_time TEXT,
      end_time TEXT,
      allowed_departments TEXT DEFAULT '[]',
      allowed_years TEXT DEFAULT '[]',
      instructions TEXT,
      status TEXT DEFAULT 'upcoming',
      created_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      test_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'medium',
      topic TEXT DEFAULT 'Algorithms',
      marks INTEGER NOT NULL DEFAULT 20,
      year INTEGER NOT NULL DEFAULT 2,
      initial_code TEXT,
      solution_code TEXT,
      input_format TEXT DEFAULT '',
      output_format TEXT DEFAULT '',
      constraints TEXT DEFAULT '',
      test_cases TEXT NOT NULL DEFAULT '[]',
      time_limit INTEGER DEFAULT 2000,
      memory_limit INTEGER DEFAULT 128,
      order_index INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS test_attempts (
      id TEXT PRIMARY KEY,
      test_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      score INTEGER DEFAULT 0,
      max_score INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'in_progress',
      tab_switches INTEGER DEFAULT 0,
      fullscreen_exits INTEGER DEFAULT 0,
      violation_count INTEGER DEFAULT 0,
      answers TEXT DEFAULT '{}',
      question_seed TEXT,
      created_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS attempt_questions (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      question_order INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      test_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      code TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'python',
      status TEXT NOT NULL DEFAULT 'pending',
      execution_time REAL DEFAULT 0,
      memory_used INTEGER DEFAULT 0,
      passed_test_cases INTEGER DEFAULT 0,
      total_test_cases INTEGER DEFAULT 0,
      score INTEGER DEFAULT 0,
      error_message TEXT,
      created_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      test_id TEXT,
      student_id TEXT NOT NULL,
      student_name TEXT,
      register_number TEXT,
      event_type TEXT NOT NULL,
      description TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      timestamp TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS login_activity (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_role TEXT NOT NULL,
      register_number TEXT,
      full_name TEXT NOT NULL,
      login_time TEXT NOT NULL,
      logout_time TEXT,
      last_active TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      status TEXT DEFAULT 'active'
    );`
  ];

  for (const t of tables) {
    await client.execute(t);
  }

  // Alters for existing columns if needed
  const alters = [
    'ALTER TABLE students ADD COLUMN is_archived INTEGER DEFAULT 0;',
    'ALTER TABLE questions ADD COLUMN year INTEGER NOT NULL DEFAULT 2;',
    "ALTER TABLE questions ADD COLUMN topic TEXT DEFAULT 'Algorithms';",
    "ALTER TABLE questions ADD COLUMN input_format TEXT DEFAULT '';",
    "ALTER TABLE questions ADD COLUMN output_format TEXT DEFAULT '';",
    "ALTER TABLE questions ADD COLUMN constraints TEXT DEFAULT '';",
    'ALTER TABLE tests ADD COLUMN year INTEGER NOT NULL DEFAULT 2;',
    'ALTER TABLE tests ADD COLUMN question_count INTEGER DEFAULT 0;',
    'ALTER TABLE test_attempts ADD COLUMN question_seed TEXT;',
  ];

  for (const a of alters) {
    try {
      await client.execute(a);
    } catch (e) {
      // Column may already exist
    }
  }

  // Indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_questions_year ON questions(year);',
    'CREATE INDEX IF NOT EXISTS idx_students_year ON students(year);',
    'CREATE INDEX IF NOT EXISTS idx_tests_year ON tests(year);',
    'CREATE INDEX IF NOT EXISTS idx_attempt_questions_attempt_id ON attempt_questions(attempt_id);',
    'CREATE INDEX IF NOT EXISTS idx_attempt_questions_question_id ON attempt_questions(question_id);',
  ];

  for (const idx of indexes) {
    await client.execute(idx);
  }

  console.log('Database tables & indexes initialized.');

  // 2. Ensure test students exist
  const studentsToSeed = [
    {
      id: 'stud-2nd-arun',
      register_number: '23CS001',
      full_name: 'Arun Kumar',
      email: '23cs001@student.jit.edu',
      department: 'CSE',
      year: 2,
      section: 'A',
      status: 'active',
    },
    {
      id: 'stud-2nd-bhavya',
      register_number: '23CS002',
      full_name: 'Bhavya Sri',
      email: '23cs002@student.jit.edu',
      department: 'CSE',
      year: 2,
      section: 'A',
      status: 'active',
    },
    {
      id: 'stud-3rd-dinesh',
      register_number: '22CS001',
      full_name: 'Dinesh Karthik',
      email: '22cs001@student.jit.edu',
      department: 'CSE',
      year: 3,
      section: 'B',
      status: 'active',
    },
    {
      id: 'stud-3rd-harini',
      register_number: '22CS002',
      full_name: 'Harini Sundar',
      email: '22cs002@student.jit.edu',
      department: 'CSE',
      year: 3,
      section: 'A',
      status: 'active',
    }
  ];

  for (const s of studentsToSeed) {
    const check = await client.execute({
      sql: 'SELECT id FROM students WHERE register_number = ?',
      args: [s.register_number],
    });
    if (check.rows.length === 0) {
      await client.execute({
        sql: `INSERT INTO students (id, register_number, full_name, email, department, year, section, status, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [s.id, s.register_number, s.full_name, s.email, s.department, s.year, s.section, s.status, new Date().toISOString()],
      });
      console.log(`Seeded student: ${s.register_number} (${s.full_name}, Year ${s.year})`);
    } else {
      // Ensure year is set correctly
      await client.execute({
        sql: 'UPDATE students SET year = ? WHERE register_number = ?',
        args: [s.year, s.register_number],
      });
    }
  }

  // 3. Seed Year 2 and Year 3 Questions
  const questionsToSeed = [
    // --- YEAR 2 QUESTIONS ---
    {
      id: 'q-y2-two-sum',
      test_id: 'bank',
      title: 'Two Sum Target Problem',
      description: 'Given an array of integers `nums` and an integer `target`, return the indices of the two numbers such that they add up to `target` in ascending order separated by a space. Each input has exactly one solution.\n\nInput Format: First line contains space-separated integers for nums. Second line contains target.\nOutput Format: Two space-separated indices.',
      difficulty: 'easy',
      topic: 'Arrays & Hashing',
      marks: 25,
      year: 2,
      input_format: 'First line: space-separated integers. Second line: integer target.',
      output_format: 'Two space-separated indices i and j (i < j).',
      constraints: '2 <= len(nums) <= 10^4\n-10^9 <= nums[i] <= 10^9',
      initial_code: 'import sys\n\ndef solution():\n    lines = sys.stdin.read().splitlines()\n    if not lines: return\n    nums = list(map(int, lines[0].split()))\n    target = int(lines[1])\n    # Write your solution below\n    seen = {}\n    for i, num in enumerate(nums):\n        comp = target - num\n        if comp in seen:\n            print(f"{seen[comp]} {i}")\n            return\n        seen[num] = i\n\nsolution()\n',
      test_cases: JSON.stringify([
        { id: 'tc-y2-1a', input: '2 7 11 15\n9', expected_output: '0 1', is_hidden: false, weight: 1, explanation: 'nums[0] + nums[1] = 9' },
        { id: 'tc-y2-1b', input: '3 2 4\n6', expected_output: '1 2', is_hidden: false, weight: 1, explanation: 'nums[1] + nums[2] = 6' },
        { id: 'tc-y2-1c', input: '3 3\n6', expected_output: '0 1', is_hidden: true, weight: 1, explanation: 'identical elements' },
        { id: 'tc-y2-1d', input: '1 5 8 10 14\n18', expected_output: '2 3', is_hidden: true, weight: 1, explanation: 'larger list' },
      ]),
      time_limit: 2000,
      memory_limit: 128,
    },
    {
      id: 'q-y2-palindromes',
      test_id: 'bank',
      title: 'Count Palindromic Substrings',
      description: 'Given a string `s`, return the number of palindromic substrings in it.\n\nA string is a palindrome when it reads the same backward as forward. A substring is a contiguous sequence of characters within the string.',
      difficulty: 'medium',
      topic: 'Strings',
      marks: 25,
      year: 2,
      input_format: 'A single string s.',
      output_format: 'An integer representing count of palindromic substrings.',
      constraints: '1 <= s.length <= 1000\ns consists of lowercase English letters.',
      initial_code: 'import sys\n\ndef solution():\n    s = sys.stdin.read().strip()\n    if not s: return\n    n = len(s)\n    ans = 0\n    for center in range(2 * n - 1):\n        left = center // 2\n        right = left + (center % 2)\n        while left >= 0 and right < n and s[left] == s[right]:\n            ans += 1\n            left -= 1\n            right += 1\n    print(ans)\n\nsolution()\n',
      test_cases: JSON.stringify([
        { id: 'tc-y2-2a', input: 'abc', expected_output: '3', is_hidden: false, weight: 1, explanation: '"a", "b", "c"' },
        { id: 'tc-y2-2b', input: 'aaa', expected_output: '6', is_hidden: false, weight: 1, explanation: '"a", "a", "a", "aa", "aa", "aaa"' },
        { id: 'tc-y2-2c', input: 'racecar', expected_output: '10', is_hidden: true, weight: 1, explanation: 'odd-length palindrome' },
        { id: 'tc-y2-2d', input: 'noon', expected_output: '6', is_hidden: true, weight: 1, explanation: 'even-length palindrome' },
      ]),
      time_limit: 2000,
      memory_limit: 128,
    },
    {
      id: 'q-y2-anagrams',
      test_id: 'bank',
      title: 'Valid Anagram Pairs',
      description: 'Given two strings s and t on separate lines, return "true" if t is an anagram of s, and "false" otherwise.\n\nAn Anagram is a word formed by rearranging the letters of a different word, typically using all the original letters exactly once.',
      difficulty: 'easy',
      topic: 'Strings & Hash Map',
      marks: 25,
      year: 2,
      input_format: 'Line 1: string s\nLine 2: string t',
      output_format: '"true" or "false" in lowercase.',
      constraints: '1 <= s.length, t.length <= 5 * 10^4',
      initial_code: 'import sys\n\ndef solution():\n    lines = sys.stdin.read().splitlines()\n    if len(lines) < 2: return\n    s, t = lines[0].strip(), lines[1].strip()\n    if sorted(s) == sorted(t):\n        print("true")\n    else:\n        print("false")\n\nsolution()\n',
      test_cases: JSON.stringify([
        { id: 'tc-y2-3a', input: 'anagram\nnagaram', expected_output: 'true', is_hidden: false, weight: 1, explanation: 'is valid anagram' },
        { id: 'tc-y2-3b', input: 'rat\ncar', expected_output: 'false', is_hidden: false, weight: 1, explanation: 'not an anagram' },
        { id: 'tc-y2-3c', input: 'listen\nsilent', expected_output: 'true', is_hidden: true, weight: 1, explanation: 'classic anagram' },
        { id: 'tc-y2-3d', input: 'a\nab', expected_output: 'false', is_hidden: true, weight: 1, explanation: 'different length' },
      ]),
      time_limit: 2000,
      memory_limit: 128,
    },
    {
      id: 'q-y2-matrix-spiral',
      test_id: 'bank',
      title: 'Matrix Diagonal Sum',
      description: 'Given a square matrix of integers, return the sum of the matrix diagonals.\nOnly include the sum of all elements on the primary diagonal and all the elements on the secondary diagonal that are not part of the primary diagonal.\n\nInput Format: First line contains n (matrix size n x n). Followed by n lines of n integers.',
      difficulty: 'easy',
      topic: '2D Arrays',
      marks: 25,
      year: 2,
      input_format: 'Line 1: integer n\nNext n lines: space-separated integers',
      output_format: 'Single integer diagonal sum.',
      constraints: '1 <= n <= 100',
      initial_code: 'import sys\n\ndef solution():\n    lines = sys.stdin.read().splitlines()\n    if not lines: return\n    n = int(lines[0])\n    mat = [list(map(int, lines[i+1].split())) for i in range(n)]\n    total = 0\n    for i in range(n):\n        total += mat[i][i]\n        if i != n - 1 - i:\n            total += mat[i][n - 1 - i]\n    print(total)\n\nsolution()\n',
      test_cases: JSON.stringify([
        { id: 'tc-y2-4a', input: '3\n1 2 3\n4 5 6\n7 8 9', expected_output: '25', is_hidden: false, weight: 1, explanation: '1+5+9 + 3+7 = 25' },
        { id: 'tc-y2-4b', input: '4\n1 1 1 1\n1 1 1 1\n1 1 1 1\n1 1 1 1', expected_output: '8', is_hidden: false, weight: 1, explanation: '4 + 4 = 8' },
        { id: 'tc-y2-4c', input: '1\n5', expected_output: '5', is_hidden: true, weight: 1, explanation: '1x1 matrix' },
      ]),
      time_limit: 2000,
      memory_limit: 128,
    },

    // --- YEAR 3 QUESTIONS ---
    {
      id: 'q-y3-lis',
      test_id: 'bank',
      title: 'Longest Increasing Subsequence',
      description: 'Given an integer array `nums`, return the length of the longest strictly increasing subsequence.\n\nA subsequence is an array that can be derived by deleting some or no elements without changing the order of the remaining elements.',
      difficulty: 'hard',
      topic: 'Dynamic Programming',
      marks: 25,
      year: 3,
      input_format: 'Single line of space-separated integers.',
      output_format: 'Single integer representing length of LIS.',
      constraints: '1 <= nums.length <= 2500\n-10^4 <= nums[i] <= 10^4',
      initial_code: 'import sys\nimport bisect\n\ndef solution():\n    line = sys.stdin.read().strip()\n    if not line: return\n    nums = list(map(int, line.split()))\n    tails = []\n    for x in nums:\n        idx = bisect.bisect_left(tails, x)\n        if idx == len(tails):\n            tails.append(x)\n        else:\n            tails[idx] = x\n    print(len(tails))\n\nsolution()\n',
      test_cases: JSON.stringify([
        { id: 'tc-y3-1a', input: '10 9 2 5 3 7 101 18', expected_output: '4', is_hidden: false, weight: 1, explanation: 'The longest increasing subsequence is [2, 3, 7, 101]' },
        { id: 'tc-y3-1b', input: '0 1 0 3 2 3', expected_output: '4', is_hidden: false, weight: 1, explanation: '[0, 1, 2, 3]' },
        { id: 'tc-y3-1c', input: '7 7 7 7 7 7 7', expected_output: '1', is_hidden: true, weight: 1, explanation: 'All identical elements' },
        { id: 'tc-y3-1d', input: '4 10 4 3 8 9', expected_output: '3', is_hidden: true, weight: 1, explanation: '[4, 8, 9] or [3, 8, 9]' },
      ]),
      time_limit: 2000,
      memory_limit: 128,
    },
    {
      id: 'q-y3-parentheses-wildcard',
      test_id: 'bank',
      title: 'Valid Parentheses with Wildcards',
      description: 'Given a string `s` containing only three types of characters: `(`, `)`, and `*`, return "true" if `s` is valid, or "false" otherwise.\n\nThe following rules define a valid string:\n1. Any left parenthesis `(` must have a corresponding right parenthesis `)`.\n2. Any right parenthesis `)` must have a corresponding left parenthesis `(`.\n3. Left parenthesis `(` must go before the corresponding right parenthesis `)`.\n4. `*` could be treated as a single right parenthesis `)` or a single left parenthesis `(` or an empty string "".',
      difficulty: 'hard',
      topic: 'Greedy & Stacks',
      marks: 25,
      year: 3,
      input_format: 'Single string s.',
      output_format: '"true" or "false" in lowercase.',
      constraints: '1 <= s.length <= 100',
      initial_code: 'import sys\n\ndef solution():\n    s = sys.stdin.read().strip()\n    if not s:\n        print("true")\n        return\n    cmin, cmax = 0, 0\n    for char in s:\n        if char == "(":\n            cmax += 1\n            cmin += 1\n        elif char == ")":\n            cmax -= 1\n            cmin = max(cmin - 1, 0)\n        elif char == "*":\n            cmax += 1\n            cmin = max(cmin - 1, 0)\n        if cmax < 0:\n            print("false")\n            return\n    print("true" if cmin == 0 else "false")\n\nsolution()\n',
      test_cases: JSON.stringify([
        { id: 'tc-y3-2a', input: '()', expected_output: 'true', is_hidden: false, weight: 1, explanation: 'standard parenthesis' },
        { id: 'tc-y3-2b', input: '(*)', expected_output: 'true', is_hidden: false, weight: 1, explanation: '* as empty string' },
        { id: 'tc-y3-2c', input: '(*))', expected_output: 'true', is_hidden: true, weight: 1, explanation: '* as (' },
        { id: 'tc-y3-2d', input: ')(', expected_output: 'false', is_hidden: true, weight: 1, explanation: 'invalid sequence' },
      ]),
      time_limit: 2000,
      memory_limit: 128,
    },
    {
      id: 'q-y3-max-subarray-k',
      test_id: 'bank',
      title: 'Maximum Subarray Sum with Circular Array',
      description: 'Given a circular integer array `nums` of length n, return the maximum possible sum of a non-empty subarray of nums.\n\nA circular array means the end of the array connects to the beginning of the array.',
      difficulty: 'hard',
      topic: 'Kadane & Circular Arrays',
      marks: 25,
      year: 3,
      input_format: 'Single line of space-separated integers.',
      output_format: 'Single integer representing the maximum circular subarray sum.',
      constraints: '1 <= nums.length <= 3 * 10^4\n-3 * 10^4 <= nums[i] <= 3 * 10^4',
      initial_code: 'import sys\n\ndef solution():\n    line = sys.stdin.read().strip()\n    if not line: return\n    nums = list(map(int, line.split()))\n    total_sum = 0\n    max_sum = nums[0]\n    cur_max = 0\n    min_sum = nums[0]\n    cur_min = 0\n    for x in nums:\n        cur_max = max(cur_max + x, x)\n        max_sum = max(max_sum, cur_max)\n        cur_min = min(cur_min + x, x)\n        min_sum = min(min_sum, cur_min)\n        total_sum += x\n    if max_sum < 0:\n        print(max_sum)\n    else:\n        print(max(max_sum, total_sum - min_sum))\n\nsolution()\n',
      test_cases: JSON.stringify([
        { id: 'tc-y3-3a', input: '1 -2 3 -2', expected_output: '3', is_hidden: false, weight: 1, explanation: 'Subarray [3] has maximum sum 3' },
        { id: 'tc-y3-3b', input: '5 -3 5', expected_output: '10', is_hidden: false, weight: 1, explanation: 'Subarray [5, 5] has maximum sum 10' },
        { id: 'tc-y3-3c', input: '-3 -2 -3', expected_output: '-2', is_hidden: true, weight: 1, explanation: 'All negative array' },
      ]),
      time_limit: 2000,
      memory_limit: 128,
    },
    {
      id: 'q-y3-lru-capacity',
      test_id: 'bank',
      title: 'LRU Cache Access Counter',
      description: 'Simulate a Least Recently Used (LRU) Cache of capacity K. Given operations:\n- PUT key val\n- GET key\nOutput each GET result or -1 if not found on separate lines.\n\nInput Format: Line 1 has capacity K and number of operations N. Next N lines have commands.',
      difficulty: 'hard',
      topic: 'Ordered Structures',
      marks: 25,
      year: 3,
      input_format: 'Line 1: K N\nNext N lines: PUT key val OR GET key',
      output_format: 'GET return values, each on a new line.',
      constraints: '1 <= K <= 1000\n1 <= N <= 10000',
      initial_code: 'import sys\nfrom collections import OrderedDict\n\ndef solution():\n    lines = sys.stdin.read().splitlines()\n    if not lines: return\n    k, n = map(int, lines[0].split())\n    cache = OrderedDict()\n    for i in range(1, n + 1):\n        parts = lines[i].split()\n        op = parts[0]\n        if op == "GET":\n            key = int(parts[1])\n            if key in cache:\n                cache.move_to_end(key)\n                print(cache[key])\n            else:\n                print(-1)\n        elif op == "PUT":\n            key = int(parts[1])\n            val = int(parts[2])\n            if key in cache:\n                cache.move_to_end(key)\n            cache[key] = val\n            if len(cache) > k:\n                cache.popitem(last=False)\n\nsolution()\n',
      test_cases: JSON.stringify([
        { id: 'tc-y3-4a', input: '2 6\nPUT 1 1\nPUT 2 2\nGET 1\nPUT 3 3\nGET 2\nGET 3', expected_output: '1\n-1\n3', is_hidden: false, weight: 1, explanation: '2 is evicted when 3 is inserted' },
        { id: 'tc-y3-4b', input: '1 3\nPUT 1 10\nGET 1\nGET 2', expected_output: '10\n-1', is_hidden: false, weight: 1, explanation: 'cap 1' },
      ]),
      time_limit: 2000,
      memory_limit: 128,
    }
  ];

  for (const q of questionsToSeed) {
    const existing = await client.execute({
      sql: 'SELECT id FROM questions WHERE id = ?',
      args: [q.id],
    });
    if (existing.rows.length === 0) {
      await client.execute({
        sql: `INSERT INTO questions (id, test_id, title, description, difficulty, topic, marks, year, initial_code, input_format, output_format, constraints, test_cases, time_limit, memory_limit, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          q.id,
          q.test_id,
          q.title,
          q.description,
          q.difficulty,
          q.topic,
          q.marks,
          q.year,
          q.initial_code,
          q.input_format,
          q.output_format,
          q.constraints,
          q.test_cases,
          q.time_limit,
          q.memory_limit,
          new Date().toISOString(),
        ],
      });
      console.log(`Seeded question: ${q.id} (Year ${q.year} - ${q.title})`);
    } else {
      await client.execute({
        sql: 'UPDATE questions SET year = ?, topic = ?, test_id = ?, test_cases = ? WHERE id = ?',
        args: [q.year, q.topic, q.test_id, q.test_cases, q.id],
      });
    }
  }

  // 4. Seed Official Assessments for Year 2 and Year 3
  const testsToSeed = [
    {
      id: 'test-2nd-year-py',
      title: 'JIT 2nd Year Python Assessment',
      description: 'Official assessment for 2nd Year B.E./B.Tech candidates. Covers core Python programming, strings, array algorithms, and modular reasoning.',
      duration: 60,
      total_marks: 50,
      year: 2,
      question_count: 2, // Randomly selects 2 from Year 2 pool of 4
      passing_marks: 25,
      status: 'active',
    },
    {
      id: 'test-3rd-year-py',
      title: 'JIT 3rd Year Advanced Python Assessment',
      description: 'Official assessment for 3rd Year B.E./B.Tech candidates. Covers advanced data structures, dynamic programming, and algorithmic efficiency.',
      duration: 75,
      total_marks: 50,
      year: 3,
      question_count: 2, // Randomly selects 2 from Year 3 pool of 4
      passing_marks: 25,
      status: 'active',
    }
  ];

  for (const t of testsToSeed) {
    const existing = await client.execute({
      sql: 'SELECT id FROM tests WHERE id = ?',
      args: [t.id],
    });
    const now = new Date().toISOString();
    if (existing.rows.length === 0) {
      await client.execute({
        sql: `INSERT INTO tests (id, title, description, duration, total_marks, year, question_count, passing_marks, status, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          t.id,
          t.title,
          t.description,
          t.duration,
          t.total_marks,
          t.year,
          t.question_count,
          t.passing_marks,
          t.status,
          now,
          now,
        ],
      });
      console.log(`Seeded test: ${t.id} (${t.title}, Year ${t.year}, count=${t.question_count})`);
    } else {
      await client.execute({
        sql: 'UPDATE tests SET year = ?, question_count = ?, status = "active", updated_at = ? WHERE id = ?',
        args: [t.year, t.question_count, now, t.id],
      });
      console.log(`Updated test: ${t.id} (Year ${t.year}, count=${t.question_count})`);
    }
  }

  // 5. Verification query
  const qStats = await client.execute('SELECT year, COUNT(*) as count FROM questions GROUP BY year');
  console.log('\n=== QUESTION POOL STATS ===');
  for (const row of qStats.rows) {
    console.log(`Year ${row.year}: ${row.count} questions`);
  }

  const tStats = await client.execute('SELECT id, title, year, question_count FROM tests');
  console.log('\n=== ASSESSMENTS ===');
  for (const row of tStats.rows) {
    console.log(`[${row.id}] ${row.title} (Year: ${row.year}, Question Count: ${row.question_count})`);
  }

  const sStats = await client.execute('SELECT id, register_number, full_name, year FROM students');
  console.log('\n=== STUDENTS ===');
  for (const row of sStats.rows) {
    console.log(`[${row.id}] ${row.register_number} - ${row.full_name} (Year: ${row.year})`);
  }

  console.log('\nDatabase seeding & migration completed successfully!');
}

main().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
