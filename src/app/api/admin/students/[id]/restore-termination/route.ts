import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';
import { restoreTerminatedStudentInDb } from '@/lib/turso';

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
    const testId = body.testId || body.test_id || undefined;
    const reason = body.reason || 'Administrative review and clearance';

    const result = await restoreTerminatedStudentInDb(id, testId, adminName, reason);

    return NextResponse.json({
      message: 'Student termination successfully removed. Attempt restored to in_progress.',
      ...result,
    });
  } catch (error: any) {
    console.error('Restore student termination error:', error);
    const statusCode = error?.status && typeof error.status === 'number' ? error.status : 500;
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to remove termination' },
      { status: statusCode }
    );
  }
}
