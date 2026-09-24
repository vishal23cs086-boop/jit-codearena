import { NextRequest, NextResponse } from 'next/server';
import { runTestCases } from '@/lib/judge0/client';
import { calculateSubmissionScore } from '@/lib/scoring';
import { MOCK_QUESTIONS } from '@/lib/mockData';
import { TestCase } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { questionId, code, attemptId, studentId, attemptNumber = 1 } = await req.json();

    if (!questionId || typeof code !== 'string') {
      return NextResponse.json({ error: 'Question ID and code are required' }, { status: 400 });
    }

    // 1. Fetch Question and Test Cases securely on server
    // (In production with Supabase, query public.test_cases with service role key)
    const question = MOCK_QUESTIONS.find((q) => q.id === questionId);
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const allTestCases: TestCase[] = question.test_cases || [];

    // 2. Execute code on all test cases (both public and hidden)
    const execSummary = await runTestCases(code, allTestCases, true);

    // 3. Compute official server-side score
    const scoreResult = calculateSubmissionScore({
      totalTestCases: execSummary.totalTestCases,
      testCasesPassed: execSummary.testCasesPassed,
      executionTimeMs: execSummary.averageTimeMs,
      timeLimitMs: question.time_limit_ms,
      codeLength: code.length,
      code,
      attemptNumber,
      questionMaxMarks: question.marks,
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
