import { NextRequest, NextResponse } from 'next/server';

// In-memory counter for completion ranking across current session
let completionCounter = 0;

export async function POST(req: NextRequest) {
  try {
    const { attemptId, studentId, testId, isAutoSubmit = false, finalScores = {} } = await req.json();

    const completedAt = new Date().toISOString();
    completionCounter += 1;
    const completionRank = completionCounter;

    // Calculate total score from submitted questions
    let totalScore = 0;
    if (typeof finalScores === 'object' && finalScores !== null) {
      Object.values(finalScores).forEach((val) => {
        if (typeof val === 'number') totalScore += val;
      });
    }

    // In a production Supabase setup:
    // UPDATE test_attempts
    // SET status = isAutoSubmit ? 'auto_submitted' : 'submitted',
    //     completed_at = NOW(),
    //     completion_rank = completionRank,
    //     score = totalScore,
    //     auto_submitted = isAutoSubmit
    // WHERE id = attemptId

    return NextResponse.json({
      success: true,
      completedAt,
      completionRank,
      status: isAutoSubmit ? 'auto_submitted' : 'submitted',
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
