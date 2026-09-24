import { NextRequest, NextResponse } from 'next/server';
import { runTestCases } from '@/lib/judge0/client';
import { calculateSubmissionScore } from '@/lib/scoring';
import { getTursoClient } from '@/lib/turso';
import { TestCase } from '@/types';

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

    // 1. Fetch Question and Test Cases from Turso DB
    try {
      const client = getTursoClient();
      const qRes = await client.execute({
        sql: 'SELECT * FROM questions WHERE id = ?',
        args: [questionId],
      });
      if (qRes.rows.length > 0) {
        const row: any = qRes.rows[0];
        allTestCases = row.test_cases ? JSON.parse(String(row.test_cases)) : [];
        timeLimitMs = Number(row.time_limit || 2000);
        questionMarks = Number(row.marks || 25);
      }
    } catch (err) {
      console.warn('Turso question lookup notice:', err);
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

    // 4. Record submission in Turso
    try {
      const client = getTursoClient();
      await client.execute({
        sql: `INSERT INTO submissions (id, test_id, question_id, student_id, code, language, status, execution_time, memory_used, passed_test_cases, total_test_cases, score, created_at)
              VALUES (?, ?, ?, ?, ?, 'python', ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          attemptId || 'general',
          questionId,
          studentId || 'unknown',
          code,
          execSummary.overallStatus,
          execSummary.averageTimeMs,
          execSummary.maxMemoryKb,
          execSummary.testCasesPassed,
          execSummary.totalTestCases,
          scoreResult.finalMarks,
          new Date().toISOString(),
        ],
      });
    } catch (err) {
      // Safe non-blocking
    }

    // 5. Sanitize test case results before returning to client (NEVER expose hidden test cases inputs/expected outputs)
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
