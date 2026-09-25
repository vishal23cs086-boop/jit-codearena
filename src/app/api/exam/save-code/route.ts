import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { attemptId, questionId, code, studentId, sessionVersion, session_version } = body;

    if (!attemptId || !questionId) {
      return NextResponse.json({ error: 'Missing attempt or question parameters' }, { status: 400 });
    }

    const { validateStudentAccountAndSession, verifyQuestionForStudentAttempt, getTursoClient } = await import('@/lib/turso');

    if (studentId) {
      const verVersion = sessionVersion ?? session_version;
      const verification = await verifyQuestionForStudentAttempt(
        studentId,
        questionId,
        attemptId,
        verVersion !== undefined && verVersion !== null ? Number(verVersion) : undefined
      );
      if (!verification.valid) {
        return NextResponse.json(
          { error: verification.error || 'Auto save rejected.', message: verification.error || 'Auto save rejected.' },
          { status: verification.code || 401 }
        );
      }
    }

    const savedAt = new Date().toISOString();

    // Persist code into Turso test_attempts answers JSON
    try {
      const client = getTursoClient();
      const aRes = await client.execute({
        sql: 'SELECT answers FROM test_attempts WHERE id = ? LIMIT 1',
        args: [attemptId],
      });
      if (aRes.rows.length > 0) {
        let answers: Record<string, any> = {};
        try {
          answers = aRes.rows[0].answers ? JSON.parse(String(aRes.rows[0].answers)) : {};
        } catch {}
        answers[questionId] = {
          code,
          last_saved_at: savedAt,
        };
        await client.execute({
          sql: 'UPDATE test_attempts SET answers = ? WHERE id = ?',
          args: [JSON.stringify(answers), attemptId],
        });
      }
    } catch (saveErr) {
      console.warn('Notice saving code in Turso:', saveErr);
    }

    return NextResponse.json({
      success: true,
      lastSavedAt: savedAt,
      message: 'Code auto-saved successfully to assessment server',
    });
  } catch (error) {
    console.error('Auto save error:', error);
    return NextResponse.json({ error: 'Failed to auto save code' }, { status: 500 });
  }
}
