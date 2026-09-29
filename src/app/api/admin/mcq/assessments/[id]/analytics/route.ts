import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';
import { getMcqAssessmentAnalyticsFromDb } from '@/lib/turso';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
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

    const { id } = await context.params;
    const analytics = await getMcqAssessmentAnalyticsFromDb(id);

    return NextResponse.json({
      success: true,
      ...analytics,
    });
  } catch (error: any) {
    console.error('Fetch MCQ assessment analytics error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch assessment analytics.' },
      { status: 500 }
    );
  }
}
