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

// ==============================================================================
// Own sandboxed runner (runner/ in this repo). Used instead of Judge0 when
// RUNNER_URL and RUNNER_TOKEN are set.
// ==============================================================================

interface RunnerCaseResult {
  status: 'SUCCESS' | 'RUNTIME_ERROR' | 'TIME_LIMIT' | 'MEMORY_LIMIT' | 'OUTPUT_LIMIT' | 'COMPILATION_ERROR' | 'INTERNAL_ERROR';
  stdout: string;
  stderr: string;
  timeMs: number;
}

function runnerConfig() {
  const clean = (v?: string) => (v || '').trim().replace(/^["']|["']$/g, '');
  return { url: clean(process.env.RUNNER_URL).replace(/\/+$/, ''), token: clean(process.env.RUNNER_TOKEN) };
}

export function isRunnerConfigured(): boolean {
  const { url, token } = runnerConfig();
  return Boolean(url && token);
}

function unavailable(message: string): Judge0Result {
  return {
    stdout: null,
    stderr: message,
    compile_output: null,
    status: { id: 13, description: 'JUDGE0_UNAVAILABLE' },
    time: null,
    memory: null,
  };
}

/**
 * Runs one program against several stdins in a single runner request.
 * Returns one Judge0-shaped result per stdin, in order.
 */
export async function executeViaRunner(
  code: string,
  stdins: string[],
  timeLimitSec = 2.0,
  memoryLimitKb = 256000
): Promise<Judge0Result[]> {
  const { url, token } = runnerConfig();
  const failAll = (msg: string) => stdins.map(() => unavailable(msg));

  let response: Response;
  try {
    response = await fetch(`${url}/v1/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        code,
        cases: stdins.map((stdin) => ({ stdin })),
        timeLimitMs: Math.round(timeLimitSec * 1000),
        memoryLimitMb: Math.round(memoryLimitKb / 1024),
      }),
      signal: AbortSignal.timeout(90000),
    });
  } catch {
    return failAll('Python execution service connection failed. Please contact the examination administrator.');
  }

  if (response.status === 503) {
    return failAll('Python execution service is busy. Please wait a moment and try again. You have not been penalized.');
  }
  if (!response.ok) {
    return failAll('Python execution service encountered an error. Please contact the examination administrator.');
  }

  const data = (await response.json()) as { results?: RunnerCaseResult[] };
  if (!Array.isArray(data.results) || data.results.length !== stdins.length) {
    return failAll('Python execution service returned an invalid response.');
  }

  return data.results.map((r) => {
    if (r.status === 'INTERNAL_ERROR') return unavailable('Python execution service encountered an internal error.');
    return {
      stdout: r.stdout || null,
      stderr: r.stderr || null,
      compile_output: r.status === 'COMPILATION_ERROR' ? r.stderr : null,
      status: { id: r.status === 'SUCCESS' ? 3 : 11, description: r.status },
      time: (r.timeMs / 1000).toFixed(3),
      memory: null,
    };
  });
}

/**
 * Runs Python once against stdin on whichever engine is configured.
 */
export async function executePython(code: string, stdin: string, timeLimitSec = 2.0): Promise<Judge0Result> {
  if (isRunnerConfigured()) {
    const [result] = await executeViaRunner(code, [stdin || ''], timeLimitSec);
    return result;
  }
  return executeJudge0(code, stdin, timeLimitSec);
}

/**
 * Execute Python code against standard input using real Judge0 REST API
 */
export async function executeJudge0(
  code: string,
  stdin: string,
  timeLimitSec = 2.0,
  memoryLimitKb = 128000
): Promise<Judge0Result> {
  const apiKey = process.env.JUDGE0_API_KEY ? process.env.JUDGE0_API_KEY.trim().replace(/^["']|["']$/g, '') : '';
  const configuredUrl = process.env.JUDGE0_API_URL ? process.env.JUDGE0_API_URL.trim().replace(/^["']|["']$/g, '') : '';
  const apiHost = process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com';

  const isRapidApi = Boolean(
    (configuredUrl && configuredUrl.includes('rapidapi.com')) ||
    (apiKey && !configuredUrl)
  );

  const apiUrl = configuredUrl || (isRapidApi ? 'https://judge0-ce.p.rapidapi.com' : 'https://ce.judge0.com');

  // If RapidAPI is targeted without a valid key, report honest configuration error
  if (apiUrl.includes('rapidapi.com') && (!apiKey || apiKey.length === 0 || apiKey.includes('your_'))) {
    return {
      stdout: null,
      stderr: 'Python execution service is not configured. Please contact the examination administrator.',
      compile_output: null,
      status: { id: 13, description: 'CONFIGURATION_ERROR' },
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
    } else if (apiKey) {
      headers['X-Auth-Token'] = apiKey;
    }

    const wallTimeSec = Math.max(3, Math.ceil(timeLimitSec * 2));

    const response = await fetch(`${apiUrl}/submissions?base64_encoded=false&wait=true`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        source_code: code,
        language_id: PYTHON_LANGUAGE_ID,
        stdin: stdin || '',
        cpu_time_limit: timeLimitSec,
        wall_time_limit: wallTimeSec,
        memory_limit: memoryLimitKb,
      }),
    });

    if (!response.ok) {
      let statusDesc = 'RUNTIME_ERROR';
      let userMsg = 'Python execution service encountered an error.';

      if (response.status === 401 || response.status === 403) {
        statusDesc = 'CONFIGURATION_ERROR';
        userMsg = 'Python execution service is not configured. Please contact the examination administrator.';
      } else if (response.status === 429) {
        statusDesc = 'JUDGE0_RATE_LIMITED';
        userMsg = 'Python execution service rate limit reached. Please wait a moment and try again.';
      } else if (response.status >= 500) {
        statusDesc = 'JUDGE0_UNAVAILABLE';
        userMsg = 'Python execution service is currently unavailable. Please contact the examination administrator.';
      }

      return {
        stdout: null,
        stderr: userMsg,
        compile_output: null,
        status: { id: 11, description: statusDesc },
        time: null,
        memory: null,
        notConfigured: statusDesc === 'CONFIGURATION_ERROR',
      };
    }

    const data = await response.json();
    const rawStatusDesc = data.status?.description || 'Accepted';
    const statusId = data.status?.id || 3;

    let finalStatusDesc = rawStatusDesc;
    if (statusId === 3) finalStatusDesc = 'SUCCESS';
    else if (statusId === 5) finalStatusDesc = 'TIME_LIMIT';
    else if (statusId === 6) finalStatusDesc = 'COMPILATION_ERROR';
    else if (statusId >= 7 && statusId <= 12) finalStatusDesc = 'RUNTIME_ERROR';
    else if (statusId === 13) finalStatusDesc = 'JUDGE0_UNAVAILABLE';

    if (data.memory && data.memory > memoryLimitKb) {
      finalStatusDesc = 'MEMORY_LIMIT';
    }

    return {
      stdout: data.stdout || null,
      stderr: data.stderr || null,
      compile_output: data.compile_output || null,
      status: { id: statusId, description: finalStatusDesc },
      time: data.time || '0.00',
      memory: data.memory || 0,
    };
  } catch {
    return {
      stdout: null,
      stderr: 'Python execution service connection failed. Please contact the examination administrator.',
      compile_output: null,
      status: { id: 11, description: 'JUDGE0_UNAVAILABLE' },
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
  isSubmission = false,
  timeLimitMs = 2000
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
  let hasTimeLimit = false;
  let configurationErrorMsg: string | undefined;

  // Own runner: all cases in one request, run in parallel on the runner.
  // Judge0: one request per case, as before.
  const timeLimitSec = timeLimitMs / 1000;
  let batched: Judge0Result[] | null = null;
  if (isRunnerConfigured()) {
    batched = await executeViaRunner(code, testCases.map((tc) => tc.input || ''), timeLimitSec);
  }

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const execRes = batched ? batched[i] : await executePython(code, tc.input, timeLimitSec);

    if (execRes.notConfigured || execRes.status.description === 'CONFIGURATION_ERROR') {
      configurationErrorMsg = 'Python execution service is not configured. Please contact the examination administrator.';
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

    if (execRes.status.description === 'JUDGE0_UNAVAILABLE' || execRes.status.description === 'NETWORK_ERROR') {
      return {
        allPassed: false,
        testCasesPassed: 0,
        totalTestCases: testCases.length,
        results: [],
        averageTimeMs: 0,
        maxMemoryKb: 0,
        overallStatus: 'Execution Error',
        errorDetails: 'Python execution service is currently unavailable. Please contact the examination administrator.',
      };
    }

    const execTime = Math.round(parseFloat(execRes.time || '0') * 1000);
    const execMem = execRes.memory || 0;
    totalTimeMs += execTime;
    maxMemoryKb = Math.max(maxMemoryKb, execMem);

    const desc = execRes.status.description;
    if (desc === 'COMPILATION_ERROR' || desc === 'Compilation Error') {
      hasCompilationError = true;
    } else if (desc === 'TIME_LIMIT') {
      hasTimeLimit = true;
    } else if (desc === 'RUNTIME_ERROR' || desc === 'Runtime Error' || desc === 'MEMORY_LIMIT' || desc === 'OUTPUT_LIMIT') {
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
  } else if (hasTimeLimit) {
    overallStatus = 'Time Limit Exceeded';
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
