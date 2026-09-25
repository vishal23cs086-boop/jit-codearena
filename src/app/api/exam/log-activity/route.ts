import { NextRequest, NextResponse } from 'next/server';
import { recordActivityLogInDb, getTursoClient } from '@/lib/turso';
import { verifySessionToken } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventType, details } = body;

    let studentId = body.studentId;
    let studentName = body.studentName;
    let registerNumber = body.registerNumber;
    let testId = body.testId;
    let attemptId = body.attemptId;
    let sessionVersion = body.sessionVersion ?? body.session_version;

    // Read authenticated session cookie
    const studentCookie = req.cookies.get('jit_student_session')?.value;
    if (studentCookie) {
      const payload = await verifySessionToken(studentCookie);
      if (payload && payload.role === 'student') {
        studentId = payload.id;
        sessionVersion = payload.session_version;
        if (payload.register_number) registerNumber = payload.register_number;
      }
    }

    if (!studentId || !eventType) {
      return NextResponse.json({ error: 'studentId and eventType are required' }, { status: 400 });
    }

    if (studentId) {
      const { validateStudentAccountAndSession } = await import('@/lib/turso');
      const validation = await validateStudentAccountAndSession(
        studentId,
        sessionVersion !== undefined && sessionVersion !== null ? Number(sessionVersion) : undefined
      );
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.message, message: validation.message },
          { status: validation.code || 401 }
        );
      }
      if (!studentName && validation.student) {
        studentName = validation.student.full_name;
      }
      if (!registerNumber && validation.student) {
        registerNumber = validation.student.register_number;
      }
    }

    const timestamp = new Date().toISOString();
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0] : '127.0.0.1';

    const desc = typeof details === 'string' ? details : (details?.description || `${eventType} detected`);

    // 1. Record immutable audit log in activity_logs
    await recordActivityLogInDb({
      test_id: testId || null,
      student_id: studentId,
      student_name: studentName,
      register_number: registerNumber,
      event_type: eventType,
      description: desc,
      metadata: { ...details, ipAddress, userAgent, attemptId },
    });

    // 2. Update student_presence and test_attempts
    try {
      const client = getTursoClient();

      if (eventType === 'WARNING_TRIGGERED') {
        // Enforce warning state capped at 3
        await client.execute({
          sql: 'UPDATE student_presence SET violation_count = MIN(3, violation_count + 1) WHERE student_id = ?',
          args: [studentId],
        });
      } else if (eventType === 'TAB_SWITCH') {
        if (attemptId) {
          await client.execute({
            sql: 'UPDATE test_attempts SET tab_switches = tab_switches + 1 WHERE id = ?',
            args: [attemptId],
          });
        }
      } else if (eventType === 'FULLSCREEN_EXIT') {
        if (attemptId) {
          await client.execute({
            sql: 'UPDATE test_attempts SET fullscreen_exits = fullscreen_exits + 1 WHERE id = ?',
            args: [attemptId],
          });
        }
      }
    } catch {
      // safe non-blocking
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
