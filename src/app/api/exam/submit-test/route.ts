import { NextRequest, NextResponse } from 'next/server';
import { getTursoClient, recordActivityLogInDb } from '@/lib/turso';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      attemptId,
      studentId,
      studentName,
      registerNumber,
      testId,
      sessionVersion,
      session_version,
      isAutoSubmit = false,
      finalScores = {},
    } = body;

    if (studentId) {
      const { validateStudentAccountAndSession } = await import('@/lib/turso');
      const verVersion = sessionVersion ?? session_version;
      const validation = await validateStudentAccountAndSession(
        studentId,
        verVersion !== undefined && verVersion !== null ? Number(verVersion) : undefined
      );
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.message, message: validation.message },
          { status: validation.code || 401 }
        );
      }
    }

    const completedAt = new Date().toISOString();

    // Calculate total score from submitted questions
    let totalScore = 0;
    if (typeof finalScores === 'object' && finalScores !== null) {
      Object.values(finalScores).forEach((val) => {
        if (typeof val === 'number') totalScore += val;
      });
    }

    const client = getTursoClient();

    // Count existing completed attempts to determine completion rank
    const countRes = await client.execute({
      sql: "SELECT COUNT(*) as count FROM test_attempts WHERE test_id = ? AND (status = 'submitted' OR status = 'completed' OR status = 'auto_submitted')",
      args: [testId || ''],
    });
    const completionRank = Number(countRes.rows[0]?.count || 0) + 1;

    // Upsert or update attempt record in Turso
    const attId = attemptId || `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await client.execute({
      sql: `INSERT INTO test_attempts (id, test_id, student_id, start_time, end_time, score, max_score, status, answers, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 100, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              end_time = excluded.end_time,
              score = excluded.score,
              status = excluded.status,
              answers = excluded.answers`,
      args: [
        attId,
        testId || 'general',
        studentId,
        completedAt,
        completedAt,
        totalScore,
        isAutoSubmit ? 'auto_submitted' : 'completed',
        JSON.stringify(finalScores),
        completedAt,
      ],
    });

    // Clear active assessment from presence
    await client.execute({
      sql: "UPDATE student_presence SET active_assessment_id = null, session_status = 'ONLINE' WHERE student_id = ?",
      args: [studentId],
    });

    // Record activity log
    await recordActivityLogInDb({
      test_id: testId || null,
      student_id: studentId,
      student_name: studentName,
      register_number: registerNumber,
      event_type: isAutoSubmit ? 'AUTO_SUBMISSION' : 'TEST_COMPLETED',
      description: `Assessment submitted with score ${totalScore}/100. Completion Rank: #${completionRank}`,
      metadata: { finalScores, completionRank, isAutoSubmit },
    });

    return NextResponse.json({
      success: true,
      completedAt,
      completionRank,
      status: isAutoSubmit ? 'auto_submitted' : 'completed',
      totalScore,
      message: isAutoSubmit
        ? 'Time expired. Assessment automatically finalized and submitted.'
        : 'Assessment completed and submitted successfully.',
    });
  } catch (error) {
    console.error('Finalize test error:', error);
    return NextResponse.json({ error: 'Failed to finalize test' }, { status: 500 });
  }
}
