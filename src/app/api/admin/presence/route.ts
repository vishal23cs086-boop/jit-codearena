import { NextRequest, NextResponse } from 'next/server';
import { getPresenceListFromDb, getTursoClient, recordActivityLogInDb } from '@/lib/turso';

export async function GET() {
  try {
    const students = await getPresenceListFromDb();
    return NextResponse.json({
      success: true,
      count: students.length,
      students,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Admin presence fetch error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch presence data' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, student_id, register_number, assessment_id, reason } = body;
    const client = getTursoClient();

    if (action === 'terminate') {
      // Mark attempt as terminated
      if (assessment_id) {
        await client.execute({
          sql: "UPDATE test_attempts SET status = 'terminated', end_time = ? WHERE test_id = ? AND student_id = ?",
          args: [new Date().toISOString(), assessment_id, student_id],
        });
      }
      // Clear active assessment from presence
      await client.execute({
        sql: "UPDATE student_presence SET active_assessment_id = null, session_status = 'OFFLINE', violation_count = 0 WHERE student_id = ?",
        args: [student_id],
      });
      // Log event
      await recordActivityLogInDb({
        test_id: assessment_id || null,
        student_id,
        register_number,
        event_type: 'WARNING_TRIGGERED',
        description: `Session terminated by Administrator. Reason: ${reason || 'Proctoring violation'}`,
      });

      return NextResponse.json({ success: true, message: 'Candidate session terminated.' });
    }

    if (action === 'reset_warnings') {
      await client.execute({
        sql: "UPDATE student_presence SET violation_count = 0 WHERE student_id = ?",
        args: [student_id],
      });
      if (assessment_id) {
        await client.execute({
          sql: "UPDATE test_attempts SET violation_count = 0, tab_switches = 0, fullscreen_exits = 0 WHERE test_id = ? AND student_id = ?",
          args: [assessment_id, student_id],
        });
      }
      await recordActivityLogInDb({
        test_id: assessment_id || null,
        student_id,
        register_number,
        event_type: 'WARNING_TRIGGERED',
        description: 'Administrator cleared candidate security violation count.',
      });

      return NextResponse.json({ success: true, message: 'Warnings reset to 0.' });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Presence action error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Action failed' },
      { status: 500 }
    );
  }
}
