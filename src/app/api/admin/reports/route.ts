import { NextRequest, NextResponse } from 'next/server';
import { getTursoClient, initTursoDb } from '@/lib/turso';

export async function GET(req: NextRequest) {
  try {
    await initTursoDb();
    const client = getTursoClient();

    const sql = `
      SELECT 
        ta.id,
        ta.test_id,
        ta.student_id,
        ta.start_time,
        ta.end_time,
        ta.score,
        ta.max_score,
        ta.percentage,
        ta.time_taken_seconds,
        ta.completion_rank,
        ta.question_results,
        ta.status,
        ta.tab_switches,
        ta.fullscreen_exits,
        ta.violation_count,
        ta.answers,
        ta.created_at,
        s.register_number,
        s.full_name,
        s.department,
        s.year,
        s.email,
        t.title as test_title,
        t.duration as test_duration
      FROM test_attempts ta
      LEFT JOIN students s ON ta.student_id = s.id
      LEFT JOIN tests t ON ta.test_id = t.id
      ORDER BY ta.created_at DESC
    `;

    const res = await client.execute(sql);

    const attempts = res.rows.map((r: any) => {
      const score = Number(r.score || 0);
      const maxScore = Number(r.max_score || 100);
      const percentage = r.percentage !== undefined && r.percentage !== null && Number(r.percentage) > 0
        ? Number(r.percentage)
        : maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

      let timeTakenSeconds = Number(r.time_taken_seconds || 0);
      if (timeTakenSeconds <= 0) {
        if (r.start_time && r.end_time) {
          timeTakenSeconds = Math.max(1, Math.floor((new Date(r.end_time).getTime() - new Date(r.start_time).getTime()) / 1000));
        } else if (r.start_time) {
          timeTakenSeconds = Math.max(1, Math.floor((Date.now() - new Date(r.start_time).getTime()) / 1000));
        }
      }

      return {
        id: String(r.id),
        test_id: String(r.test_id),
        student_id: String(r.student_id),
        score,
        max_score: maxScore,
        total_marks: maxScore,
        percentage,
        started_at: r.start_time ? String(r.start_time) : String(r.created_at),
        completed_at: r.end_time ? String(r.end_time) : null,
        status: (r.status as 'completed' | 'in_progress' | 'timed_out' | 'submitted' | 'auto_submitted') || 'in_progress',
        tab_switch_count: Number(r.tab_switches || 0),
        fullscreen_exit_count: Number(r.fullscreen_exits || 0),
        time_taken_seconds: timeTakenSeconds,
        completion_rank: Number(r.completion_rank || 1),
        students: {
          register_number: r.register_number ? String(r.register_number) : 'N/A',
          department: r.department ? String(r.department) : 'Engineering',
          year: Number(r.year || 2),
          profiles: {
            full_name: r.full_name ? String(r.full_name) : 'Student',
          },
        },
        tests: {
          title: r.test_title ? String(r.test_title) : 'Python Assessment',
        },
      };
    });

    return NextResponse.json({
      success: true,
      count: attempts.length,
      attempts,
    });
  } catch (error: any) {
    console.error('Fetch reports attempts error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch reports data' },
      { status: 500 }
    );
  }
}
