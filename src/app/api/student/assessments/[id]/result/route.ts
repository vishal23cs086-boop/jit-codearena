import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';
import { getStudentAssessmentResultFromDb, validateStudentAccountAndSession } from '@/lib/turso';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const testId = params.id;

    if (!testId) {
      return NextResponse.json(
        { success: false, error: 'Assessment ID is required.' },
        { status: 400 }
      );
    }

    // 1. Authenticate student session
    const studentCookie = req.cookies.get('jit_student_session')?.value;
    if (!studentCookie) {
      return NextResponse.json(
        { success: false, error: 'Student authentication required.' },
        { status: 401 }
      );
    }

    const payload = await verifySessionToken(studentCookie);
    if (!payload || payload.role !== 'student') {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired student session.' },
        { status: 401 }
      );
    }

    // 2. Validate student account status
    const studentValidation = await validateStudentAccountAndSession(
      payload.id,
      payload.session_version
    );
    if (!studentValidation.valid) {
      return NextResponse.json(
        { success: false, error: studentValidation.message },
        { status: studentValidation.code || 401 }
      );
    }

    // 3. Fetch authoritative assessment result from Turso DB
    const result = await getStudentAssessmentResultFromDb(testId, payload.id);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'No assessment evaluation records were found for this session.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('Student assessment result fetch error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch assessment result.' },
      { status: 500 }
    );
  }
}
