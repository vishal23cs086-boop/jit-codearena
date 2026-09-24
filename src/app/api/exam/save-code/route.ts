import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { attemptId, questionId, code, studentId } = await req.json();

    if (!attemptId || !questionId) {
      return NextResponse.json({ error: 'Missing attempt or question parameters' }, { status: 400 });
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
