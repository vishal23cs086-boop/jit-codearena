import { NextRequest, NextResponse } from 'next/server';
import { getSecurityEventsFromDb } from '@/lib/turso';
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

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get('limit') || 100);

    const events = await getSecurityEventsFromDb(limit);

    return NextResponse.json({
      success: true,
      count: events.length,
      events,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Fetch security events error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch security events' },
      { status: 500 }
    );
  }
}
