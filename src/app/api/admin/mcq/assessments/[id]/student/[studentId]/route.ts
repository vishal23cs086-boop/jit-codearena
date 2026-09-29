import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';
import { getMcqStudentResultDrilldownFromDb } from '@/lib/turso';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const adminCookie = req.cookies.get('jit_admin_session')?.value;
    if (!adminCookie) {
      return NextResponse.json({ success: false, error: 'Admin authentication required.' }, { status: 401 });
    }
    const session = await verifySessionToken(adminCookie);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const { id, studentId } = await context.params;
    const drilldown = await getMcqStudentResultDrilldownFromDb(id, studentId);

    if (!drilldown) {
      return NextResponse.json(
        { success: false, error: 'Student attempt records not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...drilldown,
    });
  } catch (error: any) {
    console.error('Fetch student MCQ drilldown error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch student result drilldown.' },
      { status: 500 }
    );
  }
}
