import { NextRequest, NextResponse } from 'next/server';
import { runTestCases } from '@/lib/judge0/client';
import { calculateSubmissionScore } from '@/lib/scoring';
import { getTursoClient, recordCodeExecutionInDb, recordActivityLogInDb } from '@/lib/turso';
import { getStudentSession } from '@/lib/session';
import { TestCase } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { questionId, code, attemptId } = body;

    // Identity comes only from the signed session cookie
    const session = await getStudentSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 });
    }
    const studentId = session.id;

    if (!questionId || typeof code !== 'string' || !attemptId || attemptId === 'general') {
      return NextResponse.json({ error: 'Question, attempt and code are required' }, { status: 400 });
    }

    // Checks: account active, question exists and matches the student's year,
    // attempt exists, belongs to this student, is still open and within time
    const { verifyQuestionForStudentAttempt } = await import('@/lib/turso');
    const verification = await verifyQuestionForStudentAttempt(studentId, questionId, attemptId, session.session_version);
    if (!verification.valid) {
      return NextResponse.json(
        {
          error: verification.error || 'Submission rejected.',
          message: verification.error || 'Submission rejected.',
        },
        { status: verification.code || 401 }
      );
    }

    // Everything that affects grading comes from the database, never from the request
    let allTestCases: TestCase[] = [];
    let timeLimitMs = 2000;
    let questionMarks = 25;
    let targetTestId = '';
    let attemptNumber = 1;
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

      const aRes = await client.execute({
        sql: 'SELECT test_id FROM test_attempts WHERE id = ? AND student_id = ? LIMIT 1',
        args: [attemptId, studentId],
      });
      if (aRes.rows.length > 0) {
        targetTestId = String(aRes.rows[0].test_id);
      }

      // Counted server-side: the attempts component of the score depends on it
      const cRes = await client.execute({
        sql: 'SELECT COUNT(*) AS n FROM submissions WHERE student_id = ? AND question_id = ? AND attempt_id = ?',
        args: [studentId, questionId, attemptId],
      });
      attemptNumber = Number(cRes.rows[0]?.n || 0) + 1;
    } catch (err) {
      console.warn('Turso question lookup notice:', err);
    }

    if (allTestCases.length === 0) {
      return NextResponse.json(
        { error: 'No test cases found for the specified question in database' },
        { status: 404 }
      );
    }

    const execSummary = await runTestCases(code, allTestCases, true, timeLimitMs);

    // If Judge0 infrastructure failure or misconfiguration, do NOT penalize student with 0 marks
    if (execSummary.overallStatus === 'Execution Error') {
      if (studentId) {
        await recordActivityLogInDb({
          test_id: targetTestId || undefined,
          student_id: studentId,
          event_type: 'INFRASTRUCTURE_ERROR',
          description: `Execution engine error during submission evaluation for question ${questionId}.`,
          metadata: { questionId, error: execSummary.errorDetails },
        }).catch(() => {});
      }

      return NextResponse.json(
        {
          success: false,
          status: 'Execution Error',
          isInfrastructureError: true,
          error: execSummary.errorDetails || 'Python execution service is unavailable. Your submission has not been penalized.',
        },
        { status: 503 }
      );
    }

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
          test_id: targetTestId || undefined,
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
