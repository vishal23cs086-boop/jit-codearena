import { NextRequest, NextResponse } from 'next/server';
import { runTestCases } from '@/lib/judge0/client';
import { calculateSubmissionScore } from '@/lib/scoring';
import { getTursoClient, recordCodeExecutionInDb, recordActivityLogInDb } from '@/lib/turso';
import { verifySessionToken } from '@/lib/session';
import { TestCase } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      questionId,
      code,
      attemptId,
      attemptNumber = 1,
      testCases: clientTestCases,
      timeLimitMs: clientTimeLimit,
      marks: clientMarks,
    } = body;

    let studentId = body.studentId;
    let sessionVersion = body.sessionVersion ?? body.session_version;

    // Check authenticated session cookie
    const studentCookie = req.cookies.get('jit_student_session')?.value;
    if (studentCookie) {
      const payload = await verifySessionToken(studentCookie);
      if (payload && payload.role === 'student') {
        studentId = payload.id;
        sessionVersion = payload.session_version;
      }
    }

    if (!questionId || typeof code !== 'string') {
      return NextResponse.json({ error: 'Question ID and code are required' }, { status: 400 });
    }

    // Strict Academic Year & Attempt Assignment Guard & Student Validation
    if (studentId) {
      const { verifyQuestionForStudentAttempt } = await import('@/lib/turso');
      const verification = await verifyQuestionForStudentAttempt(
        studentId,
        questionId,
        attemptId,
        sessionVersion !== undefined && sessionVersion !== null ? Number(sessionVersion) : undefined
      );
      if (!verification.valid) {
        return NextResponse.json(
          {
            error: verification.error || 'Submission rejected.',
            message: verification.error || 'Submission rejected.',
          },
          { status: verification.code || 401 }
        );
      }
    }

    let allTestCases: TestCase[] = [];
    let timeLimitMs = typeof clientTimeLimit === 'number' ? clientTimeLimit : 2000;
    let questionMarks = typeof clientMarks === 'number' ? clientMarks : 25;
    let targetTestId = body.testId || '';

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

      if (!targetTestId && attemptId) {
        const aRes = await client.execute({
          sql: 'SELECT test_id FROM test_attempts WHERE id = ? LIMIT 1',
          args: [attemptId],
        });
        if (aRes.rows.length > 0) {
          targetTestId = String(aRes.rows[0].test_id);
        }
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

    const now = new Date().toISOString();
    const submissionId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // 4. Record submission in Turso
    try {
      const client = getTursoClient();
      await client.execute({
        sql: `INSERT INTO submissions (id, test_id, question_id, student_id, code, language, status, execution_time, memory_used, passed_test_cases, total_test_cases, score, created_at, attempt_id)
              VALUES (?, ?, ?, ?, ?, 'python', ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          submissionId,
          targetTestId || attemptId || 'general',
          questionId,
          studentId || 'unknown',
          code,
          execSummary.overallStatus,
          execSummary.averageTimeMs,
          execSummary.maxMemoryKb,
          execSummary.testCasesPassed,
          execSummary.totalTestCases,
          scoreResult.finalMarks,
          now,
          attemptId || null,
        ],
      });

      // Record in code_executions audit trail
      if (studentId) {
        await recordCodeExecutionInDb({
          student_id: studentId,
          attempt_id: attemptId || null,
          question_id: questionId,
          source_code: code,
          language: 'python',
          execution_status: execSummary.overallStatus,
          test_cases_passed: execSummary.testCasesPassed,
          test_cases_failed: execSummary.totalTestCases - execSummary.testCasesPassed,
          execution_time: execSummary.averageTimeMs,
          memory_used: execSummary.maxMemoryKb,
        }).catch(() => {});

        await recordActivityLogInDb({
          test_id: targetTestId || null,
          student_id: studentId,
          event_type: 'SUBMISSION',
          description: `Submitted solution for question ${questionId}. Status: ${execSummary.overallStatus}. Score: ${scoreResult.finalMarks}/${questionMarks}`,
          metadata: {
            submissionId,
            questionId,
            score: scoreResult.finalMarks,
            maxMarks: questionMarks,
            testCasesPassed: execSummary.testCasesPassed,
            totalTestCases: execSummary.totalTestCases,
          },
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('Error saving submission:', err);
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
