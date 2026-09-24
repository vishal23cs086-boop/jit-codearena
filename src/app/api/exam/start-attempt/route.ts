import { NextRequest, NextResponse } from 'next/server';
import { startOrGetAssessmentAttempt } from '@/lib/turso';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { testId, studentId } = body;

    if (!testId || !studentId) {
      return NextResponse.json(
        { success: false, error: 'Test ID and Student ID are required.' },
        { status: 400 }
      );
    }

    const sessionVersion = body.session_version ?? body.sessionVersion;
    const result = await startOrGetAssessmentAttempt(
      testId,
      studentId,
      sessionVersion !== undefined && sessionVersion !== null ? Number(sessionVersion) : undefined
    );

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
