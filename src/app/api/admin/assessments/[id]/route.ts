import { NextRequest, NextResponse } from 'next/server';
import { getAssessmentWithQuestions, updateAssessmentInDb, deleteOrArchiveAssessmentInDb } from '@/lib/turso';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const test = await getAssessmentWithQuestions(id);
    if (!test) {
      return NextResponse.json(
        { success: false, error: 'Assessment not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, assessment: test });
  } catch (error: any) {
    console.error('Fetch assessment error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch assessment' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const normalizedCode = body.code !== undefined ? body.code : (body.assessment_code !== undefined ? body.assessment_code : body.assessmentCode);
    const normalizedDuration =
      body.duration !== undefined
        ? Number(body.duration)
        : body.duration_minutes !== undefined
        ? Number(body.duration_minutes)
        : body.durationMinutes !== undefined
        ? Number(body.durationMinutes)
        : body.duration_seconds !== undefined
        ? Math.round(Number(body.duration_seconds) / 60)
        : body.durationSeconds !== undefined
        ? Math.round(Number(body.durationSeconds) / 60)
        : undefined;

    const normalizedTotal = body.total_marks !== undefined ? Number(body.total_marks) : body.totalMarks !== undefined ? Number(body.totalMarks) : undefined;
    const normalizedPassing = body.passing_marks !== undefined ? Number(body.passing_marks) : body.passingMarks !== undefined ? Number(body.passingMarks) : undefined;
    const normalizedStart = body.start_time !== undefined ? body.start_time : body.start_at !== undefined ? body.start_at : body.startAt;
    const normalizedEnd = body.end_time !== undefined ? body.end_time : body.end_at !== undefined ? body.end_at : body.endAt;
    const normalizedQuestionCount = body.question_count !== undefined ? Number(body.question_count) : body.questionCount !== undefined ? Number(body.questionCount) : undefined;

    const result = await updateAssessmentInDb(id, {
      title: body.title,
      description: body.description,
      code: normalizedCode,
      instructions: body.instructions,
      duration: normalizedDuration,
      total_marks: normalizedTotal,
      passing_marks: normalizedPassing,
      start_time: normalizedStart,
      end_time: normalizedEnd,
      status: body.status,
      year: body.year !== undefined ? Number(body.year) : undefined,
      question_count: normalizedQuestionCount,
      questions: body.questions,
    });

    return NextResponse.json({
      success: true,
      assessment: result.assessment,
      had_active_attempts: result.had_active_attempts,
    });
  } catch (error: any) {
    console.error('Update assessment error:', error);
    const statusCode = error?.status && typeof error.status === 'number' ? error.status : 400;
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update assessment' },
      { status: statusCode }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await deleteOrArchiveAssessmentInDb(id);
    return NextResponse.json({
      success: true,
      action: res.action,
      message: res.message,
    });
  } catch (error: any) {
    console.error('Delete assessment error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete/archive assessment' },
      { status: 500 }
    );
  }
}
