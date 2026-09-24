import { NextRequest, NextResponse } from 'next/server';
import { validateStudentAccountAndSession } from '@/lib/turso';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const studentId = body.student_id || body.studentId || req.headers.get('x-student-id');
    const sessionVersion = body.session_version ?? body.sessionVersion ?? req.headers.get('x-session-version');

    if (!studentId) {
      return NextResponse.json(
        { success: false, valid: false, message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const versionNum = sessionVersion !== undefined && sessionVersion !== null ? Number(sessionVersion) : undefined;
    const validation = await validateStudentAccountAndSession(studentId, versionNum);

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          code: validation.code,
          message: validation.message,
          error: validation.message,
        },
        { status: validation.code }
      );
    }

    return NextResponse.json({
      success: true,
      valid: true,
      session_version: validation.student.session_version,
      student: {
        id: validation.student.id,
        register_number: validation.student.register_number,
        full_name: validation.student.full_name,
        status: validation.student.status,
        is_active: validation.student.is_active,
        is_archived: validation.student.is_archived,
      },
    });
  } catch (error: any) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { success: false, valid: false, message: 'Error checking session' },
      { status: 500 }
    );
  }
}
