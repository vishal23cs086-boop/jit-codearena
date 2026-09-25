import { NextRequest, NextResponse } from 'next/server';
import { finalizeAssessmentAttemptInDb } from '@/lib/turso';
import { verifySessionToken } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { attemptId, isAutoSubmit = false } = body;

    let studentId = body.studentId;
    let testId = body.testId;

    // Check signed session cookie
    const studentCookie = req.cookies.get('jit_student_session')?.value;
    if (studentCookie) {
      const payload = await verifySessionToken(studentCookie);
      if (payload && payload.role === 'student') {
        studentId = payload.id;
      }
    }

    if (!attemptId || !studentId) {
      return NextResponse.json(
        { error: 'attemptId and studentId are required' },
        { status: 400 }
      );
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
      { status: 500 }
    );
  }
}
