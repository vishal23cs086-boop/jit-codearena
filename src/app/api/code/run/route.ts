import { NextRequest, NextResponse } from 'next/server';
import { executeJudge0 } from '@/lib/judge0/client';
import { verifySessionToken } from '@/lib/session';
import { recordCodeExecutionInDb, recordActivityLogInDb } from '@/lib/turso';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, input, timeLimitMs, questionId, attemptId } = body;

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
    const result = await executeJudge0(code, input || '', timeLimitSec);

    const execStatus = result.status.description;
    const timeMs = Math.round(parseFloat(result.time || '0.05') * 1000);
    const memoryKb = result.memory || 3400;

    // Audit trail: persist execution history in Turso
    if (studentId) {
      await recordCodeExecutionInDb({
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
      }).catch((err) => console.warn('Execution audit log notice:', err));

      await recordActivityLogInDb({
        test_id: attemptId ? attemptId.replace(/^att-/, '').split('-')[0] : null,
        student_id: studentId,
        event_type: 'CODE_RUN',
        description: `Candidate executed code for question ${questionId || 'unknown'}. Status: ${execStatus}`,
        metadata: { questionId, status: execStatus, timeMs, memoryKb },
      }).catch(() => {});
    }

    const isSuccess = execStatus === 'SUCCESS' || execStatus === 'Accepted';

    return NextResponse.json({
      success: isSuccess,
      stdout: result.stdout,
      stderr: result.stderr,
      compile_output: result.compile_output,
      status: execStatus,
      timeMs,
      memoryKb,
    });
  } catch (error) {
    console.error('Run code error:', error);
    return NextResponse.json(
      { error: 'Failed to execute code' },
      { status: 500 }
    );
  }
}
