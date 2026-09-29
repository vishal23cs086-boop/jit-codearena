import { NextRequest, NextResponse } from 'next/server';
import { executePython } from '@/lib/judge0/client';
import { getStudentSession } from '@/lib/session';
import { recordCodeExecutionInDb, recordActivityLogInDb } from '@/lib/turso';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, input, timeLimitMs, questionId, attemptId } = body;

    // Identity comes only from the signed session cookie
    const session = await getStudentSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 });
    }
    const studentId = session.id;

    if (typeof code !== 'string' || !questionId) {
      return NextResponse.json({ error: 'Code and question are required' }, { status: 400 });
    }

    const { verifyQuestionForStudentAttempt } = await import('@/lib/turso');
    const verification = await verifyQuestionForStudentAttempt(studentId, questionId, attemptId, session.session_version);
    if (!verification.valid) {
      return NextResponse.json(
        {
          error: verification.error || 'Execution rejected.',
          message: verification.error || 'Execution rejected.',
        },
        { status: verification.code || 401 }
      );
    }

    // Run only uses the student's own input; still cap the time a caller can request
    const timeLimitSec = Math.min(5000, Math.max(100, Number(timeLimitMs) || 2000)) / 1000;
    const result = await executePython(code, input || '', timeLimitSec);

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
