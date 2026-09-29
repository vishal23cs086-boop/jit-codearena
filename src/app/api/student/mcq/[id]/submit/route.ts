import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';
import { validateStudentAccountAndSession, submitStudentMcqAssessmentInDb } from '@/lib/turso';

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

    const { id } = await context.params;
    const body = await req.json();
    const { attemptId, isAutoSubmit } = body;

    if (!attemptId) {
      return NextResponse.json(
        { success: false, error: 'attemptId is required for assessment submission.' },
        { status: 400 }
      );
    }

    const result = await submitStudentMcqAssessmentInDb(id, session.id, attemptId, {
      isAutoSubmit: Boolean(isAutoSubmit),
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Submit MCQ assessment error:', error);
    const status = error?.status || 500;
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to submit MCQ assessment.',
        answeredCount: error?.answeredCount,
        totalQuestions: error?.totalQuestions,
        terminated: error?.terminated,
      },
      { status }
    );
  }
}
