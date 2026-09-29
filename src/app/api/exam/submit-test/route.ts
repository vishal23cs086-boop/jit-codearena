import { NextRequest, NextResponse } from 'next/server';
import { finalizeAssessmentAttemptInDb } from '@/lib/turso';
import { getStudentSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { attemptId, isAutoSubmit = false } = body;

    const testId = body.testId;

    // Identity comes only from the signed session cookie
    const session = await getStudentSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 });
    }
    const studentId = session.id;

    if (!attemptId) {
      return NextResponse.json({ error: 'attemptId is required' }, { status: 400 });
    }

    const result = await finalizeAssessmentAttemptInDb({
      attemptId,
      studentId,
      testId,
      isAutoSubmit: Boolean(isAutoSubmit),
    });

    return NextResponse.json({
      success: true,
      completedAt: result.completedAt,
      completionRank: result.completionRank,
      status: result.status,
      totalScore: result.score,
      maxMarks: result.totalMarks,
      percentage: result.percentage,
      passingMarks: result.passingMarks,
      isPassed: result.isPassed,
      timeTakenSeconds: result.timeTakenSeconds,
      questionResults: result.questionResults,
      message: isAutoSubmit
        ? 'Time expired. Assessment automatically finalized and submitted.'
        : 'Assessment completed and submitted successfully.',
    });
  } catch (error: any) {
    console.error('Finalize test error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to finalize test' },
      { status: error?.status || 500 }
    );
  }
}
