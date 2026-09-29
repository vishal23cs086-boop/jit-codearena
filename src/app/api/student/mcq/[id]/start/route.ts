import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';
import { validateStudentAccountAndSession, startOrGetMcqAssessmentAttempt } from '@/lib/turso';

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
    const result = await startOrGetMcqAssessmentAttempt(id, session.id);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    const statusCode = error?.status || 500;
    console.error('Start MCQ attempt error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to start MCQ assessment.' },
      { status: statusCode }
    );
  }
}
