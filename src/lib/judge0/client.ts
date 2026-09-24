// ==============================================================================
// JIT CodeArena - Real Server-Side Judge0 Python Execution Engine
// ==============================================================================

import { TestCase, TestCaseResult } from '@/types';

export interface Judge0Result {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  status: {
    id: number;
    description: string;
  };
  time: string | null;
  memory: number | null;
  notConfigured?: boolean;
}

const PYTHON_LANGUAGE_ID = 71; // Python 3.8.1 (or 92 for Python 3.11 in Judge0)

/**
 * Execute Python code against standard input using real Judge0 REST API
 */
export async function executeJudge0(
  code: string,
  stdin: string,
  timeLimitSec = 2.0,
  memoryLimitKb = 128000
): Promise<Judge0Result> {
  const apiUrl = process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';
  const apiKey = process.env.JUDGE0_API_KEY;
  const apiHost = process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com';

  // If Judge0 API key is not configured, return an honest configuration error state
  if (!apiKey || apiKey.trim().length === 0 || apiKey.includes('your_')) {
    return {
      stdout: null,
      stderr:
        'Execution Error: Judge0 API credentials (JUDGE0_API_KEY) are not configured on the server. Please configure your Judge0 API key in environment variables to execute Python code.',
      compile_output: null,
      status: { id: 13, description: 'Judge0 Not Configured' },
      time: null,
      memory: null,
      notConfigured: true,
    };
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiUrl.includes('rapidapi.com')) {
      headers['X-RapidAPI-Key'] = apiKey;
      headers['X-RapidAPI-Host'] = apiHost;
    } else {
      headers['X-Auth-Token'] = apiKey;
    }

    const response = await fetch(`${apiUrl}/submissions?base64_encoded=false&wait=true`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        source_code: code,
        language_id: PYTHON_LANGUAGE_ID,
        stdin: stdin || '',
        cpu_time_limit: timeLimitSec,
        memory_limit: memoryLimitKb,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        stdout: null,
        stderr: `Judge0 Server returned HTTP ${response.status}: ${errText}`,
        compile_output: null,
        status: { id: 11, description: 'Runtime Error' },
        time: null,
        memory: null,
      };
    }

    const data = await response.json();
    return {
      stdout: data.stdout || null,
      stderr: data.stderr || null,
      compile_output: data.compile_output || null,
      status: data.status || { id: 3, description: 'Accepted' },
      time: data.time || '0.00',
      memory: data.memory || 0,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      stdout: null,
      stderr: `Failed to connect to Judge0 execution host: ${msg}`,
      compile_output: null,
      status: { id: 11, description: 'Connection Error' },
      time: null,
      memory: null,
    };
  }
}

/**
 * Execute code across all test cases (public + hidden)
 * Strictly ensures hidden test cases are never leaked to client responses
 */
export async function runTestCases(
  code: string,
  testCases: TestCase[],
  isSubmission = false
): Promise<{
  allPassed: boolean;
  testCasesPassed: number;
  totalTestCases: number;
  results: TestCaseResult[];
  averageTimeMs: number;
  maxMemoryKb: number;
  overallStatus: 'Accepted' | 'Wrong Answer' | 'Runtime Error' | 'Time Limit Exceeded' | 'Compilation Error' | 'Execution Error';
  errorDetails?: string;
}> {
  if (!testCases || testCases.length === 0) {
    return {
      allPassed: false,
      testCasesPassed: 0,
      totalTestCases: 0,
      results: [],
      averageTimeMs: 0,
      maxMemoryKb: 0,
      overallStatus: 'Accepted',
    };
  }

  const results: TestCaseResult[] = [];
  let testCasesPassed = 0;
  let totalTimeMs = 0;
  let maxMemoryKb = 0;
  let hasRuntimeError = false;
  let hasCompilationError = false;
  let configurationErrorMsg: string | undefined;

  for (const tc of testCases) {
    const execRes = await executeJudge0(code, tc.input);

    if (execRes.notConfigured) {
      configurationErrorMsg = execRes.stderr || 'Judge0 API is not configured on the assessment server.';
      return {
        allPassed: false,
        testCasesPassed: 0,
        totalTestCases: testCases.length,
        results: [],
        averageTimeMs: 0,
        maxMemoryKb: 0,
        overallStatus: 'Execution Error',
        errorDetails: configurationErrorMsg,
      };
    }

    const execTime = Math.round(parseFloat(execRes.time || '0') * 1000);
    const execMem = execRes.memory || 0;
    totalTimeMs += execTime;
    maxMemoryKb = Math.max(maxMemoryKb, execMem);

    if (execRes.status.description === 'Compilation Error') {
      hasCompilationError = true;
    } else if (execRes.status.description === 'Runtime Error') {
      hasRuntimeError = true;
    }

    // Compare normalized outputs (strip trailing spaces/newlines)
    const actualClean = (execRes.stdout || '').trim().replace(/\r\n/g, '\n');
    const expectedClean = (tc.expected_output || '').trim().replace(/\r\n/g, '\n');
    const passed = !execRes.stderr && actualClean === expectedClean;

    if (passed) {
      testCasesPassed++;
    }

    // For hidden test cases, omit the exact input and expected_output from client result
    const resultItem: TestCaseResult = {
      test_case_id: tc.id,
      is_hidden: tc.is_hidden,
      passed,
      execution_time_ms: execTime,
      memory_kb: execMem,
      error: execRes.stderr || undefined,
    };

    if (!tc.is_hidden || !isSubmission) {
      resultItem.input = tc.input;
      resultItem.expected_output = tc.expected_output;
      resultItem.actual_output = actualClean;
    }

    results.push(resultItem);
  }

  const allPassed = testCasesPassed === testCases.length;
  let overallStatus: 'Accepted' | 'Wrong Answer' | 'Runtime Error' | 'Time Limit Exceeded' | 'Compilation Error' | 'Execution Error' =
    'Accepted';

  if (hasCompilationError) {
    overallStatus = 'Compilation Error';
  } else if (hasRuntimeError) {
    overallStatus = 'Runtime Error';
  } else if (!allPassed) {
    overallStatus = 'Wrong Answer';
  }

  return {
    allPassed,
    testCasesPassed,
    totalTestCases: testCases.length,
    results,
    averageTimeMs: Math.round(totalTimeMs / (testCases.length || 1)),
    maxMemoryKb,
    overallStatus,
  };
}
