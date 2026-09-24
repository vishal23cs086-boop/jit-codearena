const BASE_URL = 'https://jit-codearena.vercel.app';

async function seedRemote() {
  console.log('Seeding remote Turso database via deployed API at:', BASE_URL);

  const questions = [
    // Year 2 questions
    {
      title: 'Two Sum Target Problem',
      description: 'Given an array of integers nums and an integer target, return indices of two numbers adding to target in ascending order.',
      difficulty: 'easy',
      topic: 'Arrays & Hashing',
      marks: 25,
      year: 2,
      input_format: 'Line 1: space-separated integers\nLine 2: integer target',
      output_format: 'Space-separated indices',
      constraints: '2 <= len(nums) <= 10^4',
      initial_code: 'import sys\n\ndef solution():\n    lines = sys.stdin.read().splitlines()\n    if not lines: return\n    nums = list(map(int, lines[0].split()))\n    target = int(lines[1])\n    seen = {}\n    for i, num in enumerate(nums):\n        comp = target - num\n        if comp in seen:\n            print(f"{seen[comp]} {i}")\n            return\n        seen[num] = i\n\nsolution()\n',
      test_cases: [
        { id: 'tc-y2-1', input: '2 7 11 15\n9', expected_output: '0 1', is_hidden: false, weight: 1 },
        { id: 'tc-y2-2', input: '3 2 4\n6', expected_output: '1 2', is_hidden: false, weight: 1 },
        { id: 'tc-y2-3', input: '3 3\n6', expected_output: '0 1', is_hidden: true, weight: 1 }
      ]
    },
    {
      title: 'Count Palindromic Substrings',
      description: 'Given a string s, return the number of palindromic substrings in it.',
      difficulty: 'medium',
      topic: 'Strings',
      marks: 25,
      year: 2,
      input_format: 'Single string s',
      output_format: 'Integer count',
      constraints: '1 <= s.length <= 1000',
      initial_code: 'import sys\n\ndef solution():\n    s = sys.stdin.read().strip()\n    if not s: return\n    n = len(s)\n    ans = 0\n    for center in range(2 * n - 1):\n        left = center // 2\n        right = left + (center % 2)\n        while left >= 0 and right < n and s[left] == s[right]:\n            ans += 1\n            left -= 1\n            right += 1\n    print(ans)\n\nsolution()\n',
      test_cases: [
        { id: 'tc-y2-p1', input: 'abc', expected_output: '3', is_hidden: false, weight: 1 },
        { id: 'tc-y2-p2', input: 'aaa', expected_output: '6', is_hidden: false, weight: 1 },
        { id: 'tc-y2-p3', input: 'racecar', expected_output: '10', is_hidden: true, weight: 1 }
      ]
    },
    {
      title: 'Valid Anagram Pairs',
      description: 'Given two strings s and t on separate lines, return "true" if t is an anagram of s, and "false" otherwise.',
      difficulty: 'easy',
      topic: 'Strings & Hash Map',
      marks: 25,
      year: 2,
      input_format: 'Line 1: string s\nLine 2: string t',
      output_format: '"true" or "false"',
      constraints: '1 <= s.length, t.length <= 5 * 10^4',
      initial_code: 'import sys\n\ndef solution():\n    lines = sys.stdin.read().splitlines()\n    if len(lines) < 2: return\n    s, t = lines[0].strip(), lines[1].strip()\n    print("true" if sorted(s) == sorted(t) else "false")\n\nsolution()\n',
      test_cases: [
        { id: 'tc-y2-a1', input: 'anagram\nnagaram', expected_output: 'true', is_hidden: false, weight: 1 },
        { id: 'tc-y2-a2', input: 'rat\ncar', expected_output: 'false', is_hidden: false, weight: 1 }
      ]
    },
    {
      title: 'Matrix Diagonal Sum',
      description: 'Given a square matrix of integers, return the sum of the matrix diagonals.',
      difficulty: 'easy',
      topic: '2D Arrays',
      marks: 25,
      year: 2,
      input_format: 'Line 1: integer n\nNext n lines: n space-separated integers',
      output_format: 'Integer sum',
      constraints: '1 <= n <= 100',
      initial_code: 'import sys\n\ndef solution():\n    lines = sys.stdin.read().splitlines()\n    if not lines: return\n    n = int(lines[0])\n    mat = [list(map(int, lines[i+1].split())) for i in range(n)]\n    total = 0\n    for i in range(n):\n        total += mat[i][i]\n        if i != n - 1 - i:\n            total += mat[i][n - 1 - i]\n    print(total)\n\nsolution()\n',
      test_cases: [
        { id: 'tc-y2-d1', input: '3\n1 2 3\n4 5 6\n7 8 9', expected_output: '25', is_hidden: false, weight: 1 },
        { id: 'tc-y2-d2', input: '4\n1 1 1 1\n1 1 1 1\n1 1 1 1\n1 1 1 1', expected_output: '8', is_hidden: false, weight: 1 }
      ]
    },

    // Year 3 questions
    {
      title: 'Longest Increasing Subsequence',
      description: 'Given an integer array nums, return the length of the longest strictly increasing subsequence.',
      difficulty: 'hard',
      topic: 'Dynamic Programming',
      marks: 25,
      year: 3,
      input_format: 'Space-separated integers',
      output_format: 'Integer length',
      constraints: '1 <= nums.length <= 2500',
      initial_code: 'import sys, bisect\n\ndef solution():\n    line = sys.stdin.read().strip()\n    if not line: return\n    nums = list(map(int, line.split()))\n    tails = []\n    for x in nums:\n        idx = bisect.bisect_left(tails, x)\n        if idx == len(tails):\n            tails.append(x)\n        else:\n            tails[idx] = x\n    print(len(tails))\n\nsolution()\n',
      test_cases: [
        { id: 'tc-y3-lis1', input: '10 9 2 5 3 7 101 18', expected_output: '4', is_hidden: false, weight: 1 },
        { id: 'tc-y3-lis2', input: '0 1 0 3 2 3', expected_output: '4', is_hidden: false, weight: 1 },
        { id: 'tc-y3-lis3', input: '7 7 7 7 7', expected_output: '1', is_hidden: true, weight: 1 }
      ]
    },
    {
      title: 'Valid Parentheses with Wildcards',
      description: 'Given a string s containing (, ), and *, return "true" if s is valid, or "false" otherwise.',
      difficulty: 'hard',
      topic: 'Greedy & Stacks',
      marks: 25,
      year: 3,
      input_format: 'Single string s',
      output_format: '"true" or "false"',
      constraints: '1 <= s.length <= 100',
      initial_code: 'import sys\n\ndef solution():\n    s = sys.stdin.read().strip()\n    if not s: print("true"); return\n    cmin, cmax = 0, 0\n    for char in s:\n        if char == "(":\n            cmax += 1; cmin += 1\n        elif char == ")":\n            cmax -= 1; cmin = max(cmin - 1, 0)\n        elif char == "*":\n            cmax += 1; cmin = max(cmin - 1, 0)\n        if cmax < 0:\n            print("false"); return\n    print("true" if cmin == 0 else "false")\n\nsolution()\n',
      test_cases: [
        { id: 'tc-y3-vp1', input: '()', expected_output: 'true', is_hidden: false, weight: 1 },
        { id: 'tc-y3-vp2', input: '(*)', expected_output: 'true', is_hidden: false, weight: 1 },
        { id: 'tc-y3-vp3', input: ')(', expected_output: 'false', is_hidden: true, weight: 1 }
      ]
    },
    {
      title: 'Maximum Circular Subarray Sum',
      description: 'Given a circular integer array nums, return the maximum possible sum of a non-empty subarray.',
      difficulty: 'hard',
      topic: 'Kadane & Circular Arrays',
      marks: 25,
      year: 3,
      input_format: 'Space-separated integers',
      output_format: 'Integer maximum sum',
      constraints: '1 <= nums.length <= 3 * 10^4',
      initial_code: 'import sys\n\ndef solution():\n    line = sys.stdin.read().strip()\n    if not line: return\n    nums = list(map(int, line.split()))\n    total_sum = 0; max_sum = nums[0]; cur_max = 0; min_sum = nums[0]; cur_min = 0\n    for x in nums:\n        cur_max = max(cur_max + x, x); max_sum = max(max_sum, cur_max)\n        cur_min = min(cur_min + x, x); min_sum = min(min_sum, cur_min)\n        total_sum += x\n    print(max_sum if max_sum < 0 else max(max_sum, total_sum - min_sum))\n\nsolution()\n',
      test_cases: [
        { id: 'tc-y3-cs1', input: '1 -2 3 -2', expected_output: '3', is_hidden: false, weight: 1 },
        { id: 'tc-y3-cs2', input: '5 -3 5', expected_output: '10', is_hidden: false, weight: 1 }
      ]
    },
    {
      title: 'LRU Cache Access Simulator',
      description: 'Simulate a Least Recently Used (LRU) Cache of capacity K with PUT and GET operations.',
      difficulty: 'hard',
      topic: 'Ordered Structures',
      marks: 25,
      year: 3,
      input_format: 'Line 1: K N\nNext N lines: PUT key val OR GET key',
      output_format: 'GET return values, each on a new line',
      constraints: '1 <= K <= 1000',
      initial_code: 'import sys\nfrom collections import OrderedDict\n\ndef solution():\n    lines = sys.stdin.read().splitlines()\n    if not lines: return\n    k, n = map(int, lines[0].split())\n    cache = OrderedDict()\n    for i in range(1, n + 1):\n        parts = lines[i].split()\n        if parts[0] == "GET":\n            key = int(parts[1])\n            if key in cache:\n                cache.move_to_end(key)\n                print(cache[key])\n            else:\n                print(-1)\n        elif parts[0] == "PUT":\n            key = int(parts[1]); val = int(parts[2])\n            if key in cache: cache.move_to_end(key)\n            cache[key] = val\n            if len(cache) > k: cache.popitem(last=False)\n\nsolution()\n',
      test_cases: [
        { id: 'tc-y3-lru1', input: '2 6\nPUT 1 1\nPUT 2 2\nGET 1\nPUT 3 3\nGET 2\nGET 3', expected_output: '1\n-1\n3', is_hidden: false, weight: 1 }
      ]
    }
  ];

  for (const q of questions) {
    try {
      const res = await fetch(`${BASE_URL}/api/admin/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(q)
      });
      const data = await res.json();
      console.log(`[Status ${res.status}] Added: Year ${q.year} - ${q.title} -> ID: ${data?.question?.id || data?.error}`);
    } catch (e) {
      console.error(`Failed to add ${q.title}:`, e);
    }
  }

  // Create or update 2nd and 3rd year tests
  const tests = [
    {
      id: 'test-2nd-year-py',
      title: 'JIT 2nd Year Python Assessment',
      description: 'Official assessment for 2nd Year B.E./B.Tech candidates. Covers core Python programming, strings, array algorithms, and modular reasoning.',
      duration: 60,
      total_marks: 50,
      year: 2,
      question_count: 2,
      passing_marks: 25,
      status: 'active'
    },
    {
      id: 'test-3rd-year-py',
      title: 'JIT 3rd Year Advanced Python Assessment',
      description: 'Official assessment for 3rd Year B.E./B.Tech candidates. Covers advanced data structures, dynamic programming, and algorithmic efficiency.',
      duration: 75,
      total_marks: 50,
      year: 3,
      question_count: 2,
      passing_marks: 25,
      status: 'active'
    }
  ];

  for (const t of tests) {
    try {
      const res = await fetch(`${BASE_URL}/api/admin/assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(t)
      });
      const data = await res.json();
      console.log(`[Status ${res.status}] Test: ${t.title} -> ${data.success ? 'Created/Updated' : data.error}`);
    } catch (e) {
      console.error(`Failed to register test ${t.title}:`, e);
    }
  }

  // Check stats
  const statsRes = await fetch(`${BASE_URL}/api/admin/questions?stats=true`);
  const stats = await statsRes.json();
  console.log('\nFinal Live Question Bank Stats:', stats);
}

seedRemote();
