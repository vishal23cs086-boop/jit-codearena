import { NextRequest, NextResponse } from 'next/server';
import { updateHeartbeatInDb } from '@/lib/turso';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      student_id,
      register_number,
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

    if (!student_id || !register_number) {
      return NextResponse.json(
        { success: false, error: 'student_id and register_number are required' },
        { status: 400 }
      );
    }

    const sessionVersion = body.session_version ?? body.sessionVersion;

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Browser';

    await updateHeartbeatInDb({
      student_id,
      session_version: sessionVersion !== undefined && sessionVersion !== null ? Number(sessionVersion) : undefined,
      register_number,
      full_name: full_name || register_number,
      department: department || 'General',
      year: year ? Number(year) : 1,
      section: section || 'A',
      current_page: current_page || '',
      active_assessment_id: active_assessment_id || null,
      current_question_index: current_question_index ? Number(current_question_index) : 0,
      total_questions: total_questions ? Number(total_questions) : 0,
      violation_count: violation_count ? Number(violation_count) : 0,
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
