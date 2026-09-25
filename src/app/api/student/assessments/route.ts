import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';
import { getTursoClient, validateStudentAccountAndSession } from '@/lib/turso';

export async function GET(req: NextRequest) {
  try {
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
    const client = getTursoClient();

    // Query assessments strictly for this student's academic year, non-archived, non-draft
    const testsRes = await client.execute({
      sql: `SELECT * FROM tests
            WHERE year = ? AND is_archived = 0 AND status != 'draft' AND status != 'archived'
            ORDER BY created_at DESC`,
      args: [studentYear],
    });

    const now = Date.now();
    const assessments = [];

    for (const row of testsRes.rows) {
      const testId = String(row.id);

      // Check student's attempt
      const attRes = await client.execute({
        sql: `SELECT id, status, score, max_score, start_time, end_time
              FROM test_attempts
              WHERE student_id = ? AND test_id = ?
              ORDER BY start_time DESC LIMIT 1`,
        args: [student.id, testId],
      });

      const attempt = attRes.rows.length > 0 ? (attRes.rows[0] as any) : null;
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
        const startMs = row.start_time ? new Date(String(row.start_time)).getTime() : null;
        const endMs = row.end_time ? new Date(String(row.end_time)).getTime() : null;

        if (startMs && now < startMs) {
          calculatedStatus = 'Upcoming';
        } else if (endMs && now > endMs) {
          calculatedStatus = 'Expired';
        } else if (
          row.status === 'live' ||
          row.status === 'active' ||
          row.status === 'published'
        ) {
          calculatedStatus = 'Available';
        } else {
          calculatedStatus = 'Expired';
        }
      }

      assessments.push({
        id: testId,
        title: String(row.title),
        description: row.description ? String(row.description) : '',
        code: row.code ? String(row.code) : '',
        assessment_code: row.code ? String(row.code) : '',
        instructions: row.instructions ? String(row.instructions) : '',
        year: studentYear,
        duration: Number(row.duration || 60),
        duration_minutes: Number(row.duration || 60),
        duration_seconds: Number(row.duration || 60) * 60,
        total_marks: Number(row.total_marks || 100),
        passing_marks: Number(row.passing_marks || 40),
        question_count: Number(row.question_count || 0),
        start_time: row.start_time ? String(row.start_time) : '',
        start_at: row.start_time ? String(row.start_time) : '',
        end_time: row.end_time ? String(row.end_time) : '',
        end_at: row.end_time ? String(row.end_time) : '',
        status: String(row.status),
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
      });
    }

    return NextResponse.json({
      success: true,
      year: studentYear,
      assessments,
    });
  } catch (error: any) {
    console.error('Fetch student assessments error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch assessments' },
      { status: 500 }
    );
  }
}
