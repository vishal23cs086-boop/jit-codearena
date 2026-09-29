import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';
import { validateStudentAccountAndSession, saveStudentMcqAnswerInDb } from '@/lib/turso';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const studentCookie = req.cookies.get('jit_student_session')?.value;
    if (!studentCookie) {
      return NextResponse.json({ success: false, error: 'Student authentication required.' }, { status: 401 });
    }
    const session = await verifySessionToken(studentCookie);
    if (!session || session.role !== 'student') {
      return NextResponse.json({ success: false, error: 'Unauthorized: Student access required.' }, { status: 403 });
    }

    const studentValidation = await validateStudentAccountAndSession(session.id, session.session_version);
    if (!studentValidation.valid) {
      return NextResponse.json(
        { success: false, error: studentValidation.message },
        { status: studentValidation.code || 401 }
      );
    }

    const body = await req.json();
    const { attemptId, questionId, selectedOption } = body;

    if (!attemptId || !questionId) {
      return NextResponse.json(
        { success: false, error: 'attemptId and questionId are required.' },
        { status: 400 }
      );
    }

    const result = await saveStudentMcqAnswerInDb(
      attemptId,
      questionId,
      session.id,
      selectedOption || null
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Save MCQ answer error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to auto-save answer.' },
      { status: 400 }
    );
  }
}
