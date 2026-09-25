import { NextRequest, NextResponse } from 'next/server';
import { getActiveAttemptsFromDb } from '@/lib/turso';
import { verifySessionToken } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const adminCookie = req.cookies.get('jit_admin_session')?.value;
    if (!adminCookie) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Admin session required.' }, { status: 401 });
    }
    const payload = await verifySessionToken(adminCookie);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden. Admin privileges required.' }, { status: 403 });
    }

    const attempts = await getActiveAttemptsFromDb();

    return NextResponse.json({
      success: true,
      count: attempts.length,
      attempts,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Fetch active attempts error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch active attempts' },
      { status: 500 }
    );
  }
}
