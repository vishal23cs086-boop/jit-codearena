import { NextRequest, NextResponse } from 'next/server';
import { getAttemptEvaluationDetails } from '@/lib/turso';
import { verifySessionToken } from '@/lib/session';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCookie = req.cookies.get('jit_admin_session')?.value;
    if (!adminCookie) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Admin session required.' }, { status: 401 });
    }
    const payload = await verifySessionToken(adminCookie);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden. Admin privileges required.' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Attempt ID is required' }, { status: 400 });
    }

    const details = await getAttemptEvaluationDetails(id);
    if (!details) {
      return NextResponse.json({ success: false, error: 'Assessment attempt not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      evaluation: details,
    });
  } catch (error: any) {
    console.error('Fetch attempt evaluation error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch evaluation details' },
      { status: 500 }
    );
  }
}
