import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';
import { resetStudentAssessmentAttemptInDb } from '@/lib/turso';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let adminName = 'admin';
    const adminCookie = req.cookies.get('jit_admin_session')?.value;
    if (adminCookie) {
      const session = await verifySessionToken(adminCookie);
      if (session && session.role === 'admin') {
        adminName = (session as any).username || session.id || 'admin';
      }
    }

    const body = await req.json().catch(() => ({}));
    const testId = body.testId || body.test_id;
    const reason = body.reason || 'Administrative re-attempt grant';

    if (!testId) {
      return NextResponse.json(
        { success: false, error: 'testId is required to reset an assessment attempt.' },
        { status: 400 }
      );
    }

    const result = await resetStudentAssessmentAttemptInDb(id, testId, adminName, reason);

    return NextResponse.json({
      message: 'Assessment attempt successfully reset. Student may start a fresh attempt.',
      ...result,
    });
  } catch (error: any) {
    console.error('Reset student attempt error:', error);
    const statusCode = error?.status && typeof error.status === 'number' ? error.status : 500;
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to reset assessment attempt' },
      { status: statusCode }
    );
  }
}
