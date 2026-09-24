import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { studentId, attemptId, eventType, details } = await req.json();

    if (!studentId || !eventType) {
      return NextResponse.json({ error: 'studentId and eventType are required' }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0] : '127.0.0.1';

    // In a live Supabase production setup:
    // INSERT INTO activity_logs (student_id, attempt_id, event_type, details, ip_address, user_agent, created_at)
    // VALUES (studentId, attemptId, eventType, details, ipAddress, userAgent, NOW())

    return NextResponse.json({
      success: true,
      loggedAt: timestamp,
      eventType,
    });
  } catch (error) {
    console.error('Log activity error:', error);
    return NextResponse.json({ error: 'Failed to record audit event' }, { status: 500 });
  }
}
