import { NextRequest, NextResponse } from 'next/server';
import { getAssessmentsFromDb, createAssessmentInDb } from '@/lib/turso';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const yearParam = searchParams.get('year');
    const tests = await getAssessmentsFromDb(includeArchived);
    const filtered = yearParam ? tests.filter((t) => t.year === Number(yearParam)) : tests;
    return NextResponse.json({
      success: true,
      assessments: filtered,
    });
  } catch (error: any) {
    console.error('Fetch assessments error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch assessments' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      description,
      code,
      assessment_code,
      assessmentCode,
      instructions,
      duration,
      duration_minutes,
      durationMinutes,
      duration_seconds,
      durationSeconds,
      total_marks,
      totalMarks,
      passing_marks,
      passingMarks,
      start_time,
      start_at,
      startAt,
      end_time,
      end_at,
      endAt,
      status,
      year,
      question_count,
      questionCount,
      questions,
    } = body;

    const normalizedCode = code || assessment_code || assessmentCode;
    const normalizedDuration =
      duration !== undefined
        ? Number(duration)
        : duration_minutes !== undefined
        ? Number(duration_minutes)
        : durationMinutes !== undefined
        ? Number(durationMinutes)
        : duration_seconds !== undefined
        ? Math.round(Number(duration_seconds) / 60)
        : durationSeconds !== undefined
        ? Math.round(Number(durationSeconds) / 60)
        : undefined;

    const normalizedTotal = total_marks !== undefined ? Number(total_marks) : totalMarks !== undefined ? Number(totalMarks) : undefined;
    const normalizedPassing = passing_marks !== undefined ? Number(passing_marks) : passingMarks !== undefined ? Number(passingMarks) : undefined;
    const normalizedStart = start_time || start_at || startAt;
    const normalizedEnd = end_time || end_at || endAt;
    const normalizedQuestionCount = question_count !== undefined ? Number(question_count) : questionCount !== undefined ? Number(questionCount) : undefined;

    const created = await createAssessmentInDb({
      title: title || '',
      description,
      code: normalizedCode,
      instructions,
      duration: normalizedDuration,
      total_marks: normalizedTotal,
      passing_marks: normalizedPassing,
      start_time: normalizedStart,
      end_time: normalizedEnd,
      status: status || 'draft',
      year: year !== undefined ? Number(year) : 2,
      question_count: normalizedQuestionCount,
      questions: questions || [],
    });

    return NextResponse.json({
      success: true,
      assessment: created,
    });
  } catch (error: any) {
    console.error('Create assessment error:', error);
    const statusCode = error?.status && typeof error.status === 'number' ? error.status : 400;
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create assessment' },
      { status: statusCode }
    );
  }
}
