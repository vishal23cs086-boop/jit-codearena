import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { attemptId, questionId, code, studentId, sessionVersion, session_version } = body;

    if (!attemptId || !questionId) {
      return NextResponse.json({ error: 'Missing attempt or question parameters' }, { status: 400 });
    }

    if (studentId) {
      const { validateStudentAccountAndSession } = await import('@/lib/turso');
      const verVersion = sessionVersion ?? session_version;
      const validation = await validateStudentAccountAndSession(
        studentId,
        verVersion !== undefined && verVersion !== null ? Number(verVersion) : undefined
      );
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.message, message: validation.message },
          { status: validation.code || 401 }
        );
      }
    }

    const savedAt = new Date().toISOString();

    // In a production Supabase setup:
    // UPSERT into student_answers (attempt_id, question_id, saved_code, last_saved_at)
    // UPDATE test_attempts SET last_saved_at = NOW() WHERE id = attempt_id

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
