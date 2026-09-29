import { NextRequest, NextResponse } from 'next/server';
import { updateHeartbeatInDb } from '@/lib/turso';
import { getStudentSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Identity comes only from the signed session cookie
    const session = await getStudentSession(req);
    if (!session || !session.register_number) {
      return NextResponse.json({ success: false, error: 'Authentication required. Please log in.' }, { status: 401 });
    }
    const student_id = session.id;
    const register_number = session.register_number;
    const session_version = session.session_version;

    const {
      full_name,
      department,
      year,
      section,
      current_page,
      active_assessment_id,
      current_question_index,
      total_questions,
      violation_count,
    } = body;

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Browser';

    await updateHeartbeatInDb({
      student_id,
      session_version: session_version !== undefined && session_version !== null ? Number(session_version) : undefined,
      register_number,
      full_name: full_name || register_number,
      department: department || 'General',
      year: year ? Number(year) : 1,
      section: section || 'A',
      current_page: current_page || '',
      active_assessment_id: active_assessment_id || null,
      current_question_index: current_question_index ? Number(current_question_index) : 0,
      total_questions: total_questions ? Number(total_questions) : 0,
      violation_count: violation_count ? Math.min(3, Number(violation_count)) : 0,
      user_agent: userAgent,
      ip_address: ip,
    });

    return NextResponse.json({ success: true, timestamp: Date.now() });
  } catch (error: any) {
    const statusCode = error?.statusCode || (error?.message?.includes('no longer active') || error?.message?.includes('session') ? 401 : 500);
    return NextResponse.json(
      {
        success: false,
        code: statusCode === 401 ? 'SESSION_REVOKED' : 'ERROR',
        error: error?.message || 'Heartbeat update failed',
        message: error?.message || 'Heartbeat update failed',
      },
      { status: statusCode }
    );
  }
}
