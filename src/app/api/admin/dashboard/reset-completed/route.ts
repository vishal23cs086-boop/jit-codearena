import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';
import { resetCompletedCountInDb, restoreCompletedCountInDb } from '@/lib/turso';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Admin Session strictly
    const adminCookie = req.cookies.get('jit_admin_session')?.value;
    if (!adminCookie) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Admin session cookie missing.' },
        { status: 401 }
      );
    }

    const session = await verifySessionToken(adminCookie);
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin access required.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const assessmentId = body.assessmentId || body.assessment_id || 'global';
    const action = body.action || 'reset';
    const resetBy = (session as any).username || session.id || 'admin';

    if (action === 'restore') {
      await restoreCompletedCountInDb(assessmentId, resetBy);
      return NextResponse.json({
        success: true,
        message: 'Historical completed count restored successfully.',
        action: 'restore',
        assessment_id: assessmentId,
      });
    }

    const result = await resetCompletedCountInDb(resetBy, assessmentId);

    return NextResponse.json({
      success: true,
      message: 'Dashboard completed count reset successfully. Historical student records and attempts remain preserved.',
      action: 'reset',
      reset_at: result.reset_at,
      reset_by: result.reset_by,
      assessment_id: result.assessment_id,
    });
  } catch (error: any) {
    console.error('Reset completed count error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to reset completed count.' },
      { status: 500 }
    );
  }
}
