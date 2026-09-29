import { NextRequest, NextResponse } from 'next/server';
import { executeJudge0, runTestCases } from '@/lib/judge0/client';
import { verifySessionToken } from '@/lib/session';
import { recordCodeExecutionInDb, recordActivityLogInDb, getTursoClient } from '@/lib/turso';
import { TestCase } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, input, customInput, isCustom, timeLimitMs, questionId, attemptId } = body;

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

    if (typeof code !== 'string') {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    // 1. Authoritative Attempt & Question Validation
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
            error: verification.error || 'Execution rejected.',
            message: verification.error || 'Execution rejected.',
          },
          { status: verification.code || 401 }
        );
      }
    }

    const timeLimitSec = (timeLimitMs || 2000) / 1000;
    const isCustomRun = Boolean(
      isCustom ||
      (typeof customInput === 'string' && customInput.trim() !== '') ||
      (body.tab === 'custom')
    );

    // 2. Execution path A: Custom Input Execution
    if (isCustomRun) {
      const stdinToUse = typeof customInput === 'string' ? customInput : (input || '');
      const result = await executeJudge0(code, stdinToUse, timeLimitSec);

      const execStatus = result.status.description;
      const isJudge0Down = execStatus === 'JUDGE0_UNAVAILABLE' || execStatus === 'CONFIGURATION_ERROR';

      if (isJudge0Down) {
        return NextResponse.json(
          {
            success: false,
            status: 'Execution Error',
            isExecutionServiceError: true,
            error: 'Code execution service is temporarily unavailable. Your assessment attempt remains active. Please try again.',
            message: 'Code execution service is temporarily unavailable. Your assessment attempt remains active. Please try again.',
          },
          { status: 503 }
        );
      }

      const timeMs = Math.round(parseFloat(result.time || '0.05') * 1000);
      const memoryKb = result.memory || 3400;

      let recorded: { id: string; execution_number: number } | undefined;
      if (studentId) {
        recorded = await recordCodeExecutionInDb({
          student_id: studentId,
          attempt_id: attemptId || null,
          question_id: questionId || null,
          source_code: code,
          language: 'python',
          execution_status: execStatus,
          execution_time: timeMs,
          memory_used: memoryKb,
          stdout: result.stdout,
          stderr: result.stderr,
          compile_output: result.compile_output,
        }).catch((err) => {
          console.warn('Execution audit log notice:', err);
          return undefined;
        });

        await recordActivityLogInDb({
          test_id: attemptId ? attemptId.replace(/^att-/, '').split('-')[0] : null,
          student_id: studentId,
          event_type: 'CODE_RUN',
          description: `Candidate executed code (custom input) for question ${questionId || 'unknown'}. Status: ${execStatus}`,
          metadata: { questionId, status: execStatus, timeMs, memoryKb },
        }).catch(() => {});
      }

      const isSuccess = execStatus === 'SUCCESS' || execStatus === 'Accepted';

      return NextResponse.json({
        success: isSuccess,
        status: execStatus,
        stdout: result.stdout,
        stderr: result.stderr,
        compile_output: result.compile_output,
        timeMs,
        memoryKb,
        executionId: recorded?.id,
        executionNumber: recorded?.execution_number,
      });
    }

    // 3. Execution path B: Standard "Run Code" evaluating across all configured 3 test cases
    let allTestCases: TestCase[] = [];
    try {
      if (questionId) {
        const client = getTursoClient();
        const qRes = await client.execute({
          sql: 'SELECT test_cases, time_limit FROM questions WHERE id = ? LIMIT 1',
          args: [questionId],
        });
        if (qRes.rows.length > 0 && qRes.rows[0].test_cases) {
          allTestCases = JSON.parse(String(qRes.rows[0].test_cases));
        }
      }
    } catch (err) {
      console.warn('Notice loading question test cases for run:', err);
    }

    if (allTestCases.length === 0 && Array.isArray(body.testCases) && body.testCases.length > 0) {
      allTestCases = body.testCases;
    }

    // Fallback single run if question has no test cases configured
    if (allTestCases.length === 0) {
      const fallbackResult = await executeJudge0(code, input || '', timeLimitSec);
      const execStatus = fallbackResult.status.description;
      const timeMs = Math.round(parseFloat(fallbackResult.time || '0.05') * 1000);
      const memoryKb = fallbackResult.memory || 3400;

      let recorded: { id: string; execution_number: number } | undefined;
      if (studentId) {
        recorded = await recordCodeExecutionInDb({
          student_id: studentId,
          attempt_id: attemptId || null,
          question_id: questionId || null,
          source_code: code,
          language: 'python',
          execution_status: execStatus,
          execution_time: timeMs,
          memory_used: memoryKb,
          stdout: fallbackResult.stdout,
          stderr: fallbackResult.stderr,
          compile_output: fallbackResult.compile_output,
        }).catch(() => undefined);
      }

      return NextResponse.json({
        success: execStatus === 'SUCCESS' || execStatus === 'Accepted',
        status: execStatus,
        stdout: fallbackResult.stdout,
        stderr: fallbackResult.stderr,
        compile_output: fallbackResult.compile_output,
        timeMs,
        memoryKb,
        executionId: recorded?.id,
        executionNumber: recorded?.execution_number,
      });
    }

    // Execute across all test cases (exactly 3 test cases)
    const execSummary = await runTestCases(code, allTestCases, false);

    // Judge0 Failure Handling (401, 403, 429, 500, 502, 503, 504)
    if (execSummary.overallStatus === 'Execution Error') {
      return NextResponse.json(
        {
          success: false,
          status: 'Execution Error',
          isExecutionServiceError: true,
          error: execSummary.errorDetails || 'Code execution service is temporarily unavailable. Your assessment attempt remains active. Please try again.',
          message: execSummary.errorDetails || 'Code execution service is temporarily unavailable. Your assessment attempt remains active. Please try again.',
        },
        { status: 503 }
      );
    }

    // Sanitize test cases for student: hidden test case input/output must remain secret
    const sanitizedResults = execSummary.results.map((r, idx) => {
      const originalCase = allTestCases[idx];
      const isHidden = Boolean(r.is_hidden || originalCase?.is_hidden);
      if (isHidden) {
        return {
          test_case_id: r.test_case_id || `tc-${idx + 1}`,
          is_hidden: true,
          passed: r.passed,
          execution_time_ms: r.execution_time_ms,
          memory_kb: r.memory_kb,
          error: r.error,
        };
      }
      return {
        test_case_id: r.test_case_id || `tc-${idx + 1}`,
        is_hidden: false,
        passed: r.passed,
        input: r.input || originalCase?.input,
        expected_output: r.expected_output || originalCase?.expected_output,
        actual_output: r.actual_output,
        execution_time_ms: r.execution_time_ms,
        memory_kb: r.memory_kb,
        error: r.error,
      };
    });

    // Determine representative stdout and stderr
    const firstFailedCase = execSummary.results.find((r) => !r.passed && !r.is_hidden);
    const firstStdout = firstFailedCase?.actual_output ?? execSummary.results[0]?.actual_output ?? '';
    const firstStderr = execSummary.results.find((r) => r.error)?.error ?? null;

    // Record in code_executions audit trail
    let recorded: { id: string; execution_number: number } | undefined;
    if (studentId) {
      recorded = await recordCodeExecutionInDb({
        student_id: studentId,
        attempt_id: attemptId || null,
        question_id: questionId || null,
        source_code: code,
        language: 'python',
        execution_status: execSummary.overallStatus,
        test_cases_passed: execSummary.testCasesPassed,
        test_cases_failed: execSummary.totalTestCases - execSummary.testCasesPassed,
        execution_time: execSummary.averageTimeMs,
        memory_used: execSummary.maxMemoryKb,
        stdout: firstStdout,
        stderr: firstStderr,
      }).catch((err) => {
        console.warn('Execution audit log notice:', err);
        return undefined;
      });

      await recordActivityLogInDb({
        test_id: attemptId ? attemptId.replace(/^att-/, '').split('-')[0] : null,
        student_id: studentId,
        event_type: 'CODE_RUN',
        description: `Candidate executed code for question ${questionId || 'unknown'}. Status: ${execSummary.overallStatus} (${execSummary.testCasesPassed}/${execSummary.totalTestCases} test cases passed)`,
        metadata: {
          questionId,
          status: execSummary.overallStatus,
          testCasesPassed: execSummary.testCasesPassed,
          totalTestCases: execSummary.totalTestCases,
          timeMs: execSummary.averageTimeMs,
          memoryKb: execSummary.maxMemoryKb,
          executionId: recorded?.id,
          executionNumber: recorded?.execution_number,
        },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: execSummary.allPassed,
      status: execSummary.overallStatus,
      passedCases: execSummary.testCasesPassed,
      totalCases: execSummary.totalTestCases,
      caseResults: sanitizedResults,
      stdout: firstStdout,
      stderr: firstStderr,
      timeMs: execSummary.averageTimeMs,
      memoryKb: execSummary.maxMemoryKb,
      executionId: recorded?.id,
      executionNumber: recorded?.execution_number,
    });
  } catch (error) {
    console.error('Run code error:', error);
    return NextResponse.json(
      { error: 'Failed to execute code' },
      { status: 500 }
    );
  }
}
