import { NextRequest, NextResponse } from 'next/server';
import { runTestCases } from '@/lib/judge0/client';
import { calculateSubmissionScore } from '@/lib/scoring';
import { createClient } from '@/lib/supabase/client';
import { TestCase } from '@/types';

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && !url.includes('mock-') && !url.includes('your-project'));
};

export async function POST(req: NextRequest) {
  try {
    const {
      questionId,
      code,
      attemptId,
      studentId,
      attemptNumber = 1,
      testCases: clientTestCases,
      timeLimitMs: clientTimeLimit,
      marks: clientMarks,
    } = await req.json();

    if (!questionId || typeof code !== 'string') {
      return NextResponse.json({ error: 'Question ID and code are required' }, { status: 400 });
    }

    let allTestCases: TestCase[] = [];
    let timeLimitMs = typeof clientTimeLimit === 'number' ? clientTimeLimit : 2000;
    let questionMarks = typeof clientMarks === 'number' ? clientMarks : 25;

    // 1. Fetch Question and Test Cases securely on server from Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('questions')
          .select('*, test_cases (*)')
          .eq('id', questionId)
          .single();

        if (!error && data) {
          allTestCases = data.test_cases || [];
          timeLimitMs = data.time_limit_ms || timeLimitMs;
          questionMarks = data.marks || questionMarks;
        }
      } catch (err) {
        console.warn('Supabase testcase lookup warning:', err);
      }
    }

    // Fallback to client-provided test cases if server database query returned empty
    if (allTestCases.length === 0 && Array.isArray(clientTestCases) && clientTestCases.length > 0) {
      allTestCases = clientTestCases;
    }

    if (allTestCases.length === 0) {
      return NextResponse.json(
        { error: 'No test cases found for the specified question in database' },
        { status: 404 }
      );
    }

    // 2. Execute code on all test cases (both public and hidden)
    const execSummary = await runTestCases(code, allTestCases, true);

    // 3. Compute official server-side score
    const scoreResult = calculateSubmissionScore({
      totalTestCases: execSummary.totalTestCases,
      testCasesPassed: execSummary.testCasesPassed,
      executionTimeMs: execSummary.averageTimeMs,
      timeLimitMs,
      codeLength: code.length,
      code,
      attemptNumber,
      questionMaxMarks: questionMarks,
    });

    // 4. Sanitize test case results before returning to client (NEVER expose hidden test cases inputs/expected outputs)
    const sanitizedResults = execSummary.results.map((r) => {
      if (r.is_hidden) {
        return {
          test_case_id: r.test_case_id,
          is_hidden: true,
          passed: r.passed,
          execution_time_ms: r.execution_time_ms,
          memory_kb: r.memory_kb,
          error: r.error,
        };
      }
      return r;
    });

    return NextResponse.json({
      success: true,
      status: execSummary.overallStatus,
      testCasesPassed: execSummary.testCasesPassed,
      totalTestCases: execSummary.totalTestCases,
      results: sanitizedResults,
      score: scoreResult.finalMarks,
      maxMarks: scoreResult.maxMarks,
      percentage: scoreResult.percentage,
      breakdown: scoreResult.breakdown,
      executionTimeMs: execSummary.averageTimeMs,
      memoryKb: execSummary.maxMemoryKb,
    });
  } catch (error) {
    console.error('Submit code error:', error);
    return NextResponse.json(
      { error: 'Server error during submission evaluation' },
      { status: 500 }
    );
  }
}
