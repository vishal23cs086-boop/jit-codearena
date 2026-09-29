import { NextRequest, NextResponse } from 'next/server';
import { validateStudentAccountAndSession } from '@/lib/turso';
import { getStudentSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    // Identity comes only from the signed session cookie. A browser that still
    // has a user in localStorage but no valid cookie gets 401 and is logged out.
    const session = await getStudentSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, valid: false, message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const validation = await validateStudentAccountAndSession(session.id, session.session_version);

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
