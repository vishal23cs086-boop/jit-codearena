import { NextRequest, NextResponse } from 'next/server';
import { recordActivityLogInDb, getTursoClient } from '@/lib/turso';
import { getStudentSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventType, details } = body;

    const testId = body.testId;
    const attemptId = body.attemptId;

    // Identity comes only from the signed session cookie
    const session = await getStudentSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 });
    }
    const studentId = session.id;

    if (!eventType) {
      return NextResponse.json({ error: 'eventType is required' }, { status: 400 });
    }

    const { validateStudentAccountAndSession } = await import('@/lib/turso');
    const validation = await validateStudentAccountAndSession(studentId, session.session_version);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.message, message: validation.message },
        { status: validation.code || 401 }
      );
    }
    // Name and register number from the database, not the request
    const studentName = validation.student?.full_name;
    const registerNumber = validation.student?.register_number;

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

    // 2. Update student_presence and test_attempts with proctoring violation enforcement
    const VIOLATION_EVENTS = new Set([
      'TAB_SWITCH',
      'FULLSCREEN_EXIT',
      'WARNING_TRIGGERED',
      'UNAUTHORIZED_KEY',
      'SECURITY_VIOLATION',
      'DEVTOOLS_OPEN',
      'COPY_PASTE_ATTEMPT',
    ]);

    let isTerminated = false;
    let currentViolationCount = 0;
    const terminationReason = 'Excessive proctoring violations recorded (violation_count > 3)';

    try {
      const client = getTursoClient();

      // Resolve attempt ID if not passed directly
      let targetAttemptId = attemptId;
      if (!targetAttemptId && studentId) {
        const activeAttRes = await client.execute({
          sql: "SELECT id, violation_count, status FROM test_attempts WHERE student_id = ? AND (status = 'in_progress' OR status = 'not_started') ORDER BY created_at DESC LIMIT 1",
          args: [studentId],
        });
        if (activeAttRes.rows.length > 0) {
          targetAttemptId = String(activeAttRes.rows[0].id);
        }
      } else if (targetAttemptId) {
        // An attempt ID from the request must belong to this student; otherwise a
        // student could add violations to (and terminate) someone else's exam
        const ownRes = await client.execute({
          sql: 'SELECT 1 FROM test_attempts WHERE id = ? AND student_id = ? LIMIT 1',
          args: [targetAttemptId, studentId],
        });
        if (ownRes.rows.length === 0) targetAttemptId = undefined;
      }

      if (VIOLATION_EVENTS.has(eventType)) {
        if (targetAttemptId) {
          if (eventType === 'TAB_SWITCH') {
            await client.execute({
              sql: 'UPDATE test_attempts SET tab_switches = tab_switches + 1, violation_count = violation_count + 1 WHERE id = ?',
              args: [targetAttemptId],
            });
          } else if (eventType === 'FULLSCREEN_EXIT') {
            await client.execute({
              sql: 'UPDATE test_attempts SET fullscreen_exits = fullscreen_exits + 1, violation_count = violation_count + 1 WHERE id = ?',
              args: [targetAttemptId],
            });
          } else {
            await client.execute({
              sql: 'UPDATE test_attempts SET violation_count = violation_count + 1 WHERE id = ?',
              args: [targetAttemptId],
            });
          }

          const attCheckRes = await client.execute({
            sql: 'SELECT violation_count, status FROM test_attempts WHERE id = ?',
            args: [targetAttemptId],
          });

          if (attCheckRes.rows.length > 0) {
            currentViolationCount = Number(attCheckRes.rows[0].violation_count || 0);
            const currentStatus = String(attCheckRes.rows[0].status);

            await client.execute({
              sql: 'UPDATE student_presence SET violation_count = ? WHERE student_id = ?',
              args: [currentViolationCount, studentId],
            });

            // Requirement 12: VIOLATION TERMINATION — 4TH VIOLATION (violation_count > 3)
            if (currentViolationCount > 3 && currentStatus !== 'terminated') {
              await client.execute({
                sql: `UPDATE test_attempts 
                      SET status = 'terminated', 
                          termination_reason = ?, 
                          terminated_at = ?, 
                          end_time = ? 
                      WHERE id = ?`,
                args: [terminationReason, timestamp, timestamp, targetAttemptId],
              });

              await client.execute({
                sql: "UPDATE student_presence SET session_status = 'TERMINATED' WHERE student_id = ?",
                args: [studentId],
              });

              await recordActivityLogInDb({
                test_id: testId || null,
                student_id: studentId,
                student_name: studentName,
                register_number: registerNumber,
                event_type: 'ATTEMPT_TERMINATED',
                description: `Attempt terminated by server: ${terminationReason}. Total violations: ${currentViolationCount}.`,
                metadata: { attempt_id: targetAttemptId, violation_count: currentViolationCount, reason: terminationReason },
              });

              isTerminated = true;
            } else if (currentStatus === 'terminated') {
              isTerminated = true;
            }
          }
        }
      } else if (targetAttemptId) {
        const attStatusRes = await client.execute({
          sql: 'SELECT status, violation_count FROM test_attempts WHERE id = ?',
          args: [targetAttemptId],
        });
        if (attStatusRes.rows.length > 0) {
          if (attStatusRes.rows[0].status === 'terminated') isTerminated = true;
          currentViolationCount = Number(attStatusRes.rows[0].violation_count || 0);
        }
      }
    } catch (err) {
      console.warn('Notice tracking proctoring violation in Turso:', err);
    }

    return NextResponse.json({
      success: true,
      loggedAt: timestamp,
      eventType,
      terminated: isTerminated,
      violationCount: currentViolationCount,
      reason: isTerminated ? terminationReason : undefined,
    });
  } catch (error) {
    console.error('Log activity error:', error);
    return NextResponse.json({ error: 'Failed to record audit event' }, { status: 500 });
  }
}
