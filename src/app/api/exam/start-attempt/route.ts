import { NextRequest, NextResponse } from 'next/server';
import { startOrGetAssessmentAttempt } from '@/lib/turso';
import { getStudentSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { testId } = body;

    // Identity comes only from the signed session cookie
    const session = await getStudentSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please log in.' },
        { status: 401 }
      );
    }

    if (!testId) {
      return NextResponse.json(
        { success: false, error: 'Test ID is required.' },
        { status: 400 }
      );
    }

    const result = await startOrGetAssessmentAttempt(testId, session.id, session.session_version);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    const statusCode = error?.status || 500;
    const message = error?.message || 'Failed to start or retrieve assessment attempt.';

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: statusCode }
    );
  }
}
