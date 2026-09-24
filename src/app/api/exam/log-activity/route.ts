import { NextRequest, NextResponse } from 'next/server';
import { recordActivityLogInDb, getTursoClient } from '@/lib/turso';

export async function POST(req: NextRequest) {
  try {
    const { studentId, studentName, registerNumber, testId, eventType, details } = await req.json();

    if (!studentId || !eventType) {
      return NextResponse.json({ error: 'studentId and eventType are required' }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0] : '127.0.0.1';

    const desc = typeof details === 'string' ? details : (details?.description || `${eventType} detected`);

    await recordActivityLogInDb({
      test_id: testId || null,
      student_id: studentId,
      student_name: studentName,
      register_number: registerNumber,
      event_type: eventType,
      description: desc,
      metadata: { ...details, ipAddress, userAgent },
    });

    // If it is a violation (TAB_SWITCH, FULLSCREEN_EXIT), increment violation count in student_presence
    if (eventType === 'TAB_SWITCH' || eventType === 'FULLSCREEN_EXIT' || eventType === 'WARNING_TRIGGERED') {
      try {
        const client = getTursoClient();
        await client.execute({
          sql: 'UPDATE student_presence SET violation_count = violation_count + 1 WHERE student_id = ?',
          args: [studentId],
        });
      } catch (err) {
        // silent
      }
    }

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
