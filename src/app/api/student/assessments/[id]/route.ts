import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';
import { getAssessmentWithQuestions, getTursoClient, validateStudentAccountAndSession } from '@/lib/turso';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let token = req.cookies.get('jit_student_session')?.value;
    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please log in as student.' },
        { status: 401 }
      );
    }

    const payload = await verifySessionToken(token);
    if (!payload || !payload.id) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired student session.' },
        { status: 401 }
      );
    }

    const validation = await validateStudentAccountAndSession(
      payload.id,
      payload.session_version
    );
    if (!validation.valid || !validation.student) {
      return NextResponse.json(
        { success: false, error: validation.message || 'Student account inactive or invalid.' },
        { status: validation.code || 401 }
      );
    }

    const student = validation.student;
    const studentYear = Number(student.year || 2);

    const test = await getAssessmentWithQuestions(id);
    if (!test || test.is_archived || test.status === 'draft') {
      return NextResponse.json(
        { success: false, error: 'Assessment not found or not available.' },
        { status: 404 }
      );
    }

    if (test.year !== studentYear) {
      return NextResponse.json(
        {
          success: false,
          error: `This assessment is configured strictly for ${test.year === 2 ? '2nd' : '3rd'} Year candidates only.`,
        },
        { status: 403 }
      );
    }

    // Check student's attempt
    const client = getTursoClient();
    const attRes = await client.execute({
      sql: `SELECT id, status, score, max_score, start_time, end_time
            FROM test_attempts
            WHERE student_id = ? AND test_id = ?
            ORDER BY start_time DESC LIMIT 1`,
      args: [student.id, id],
    });

    const attempt = attRes.rows.length > 0 ? (attRes.rows[0] as any) : null;
    const now = Date.now();
    const startMs = test.start_time ? new Date(test.start_time).getTime() : null;
    const endMs = test.end_time ? new Date(test.end_time).getTime() : null;

    let calculatedStatus: 'Available' | 'In Progress' | 'Completed' | 'Upcoming' | 'Expired' = 'Available';
    if (attempt) {
      if (
        attempt.status === 'submitted' ||
        attempt.status === 'completed' ||
        attempt.status === 'auto_submitted'
      ) {
        calculatedStatus = 'Completed';
      } else if (attempt.status === 'in_progress') {
        calculatedStatus = 'In Progress';
      }
    } else {
      if (startMs && now < startMs) {
        calculatedStatus = 'Upcoming';
      } else if (endMs && now > endMs) {
        calculatedStatus = 'Expired';
      } else if (
        test.status === 'live' ||
        test.status === 'active' ||
        test.status === 'published'
      ) {
        calculatedStatus = 'Available';
      } else {
        calculatedStatus = 'Expired';
      }
    }

    return NextResponse.json({
      success: true,
      assessment: {
        id: test.id,
        title: test.title,
        description: test.description,
        code: test.code,
        assessment_code: test.code,
        instructions: test.instructions,
        year: test.year,
        duration: test.duration,
        duration_minutes: test.duration_minutes,
        duration_seconds: test.duration_seconds,
        total_marks: test.total_marks,
        passing_marks: test.passing_marks,
        question_count: test.question_count,
        start_time: test.start_time,
        start_at: test.start_time,
        end_time: test.end_time,
        end_at: test.end_time,
        status: test.status,
        calculated_status: calculatedStatus,
        attempt: attempt
          ? {
              id: String(attempt.id),
              status: String(attempt.status),
              score: Number(attempt.score || 0),
              max_score: Number(attempt.max_score || 100),
              start_time: String(attempt.start_time),
              end_time: attempt.end_time ? String(attempt.end_time) : null,
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error('Fetch student assessment [id] error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch assessment' },
      { status: 500 }
    );
  }
}
