import { NextRequest, NextResponse } from 'next/server';
import { getAssessmentsFromDb, createAssessmentInDb } from '@/lib/turso';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const tests = await getAssessmentsFromDb(includeArchived);
    return NextResponse.json({
      success: true,
      assessments: tests,
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
    const { title, description, code, instructions, duration, total_marks, passing_marks, start_time, end_time, status, questions } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: 'Assessment title is required.' },
        { status: 400 }
      );
    }

    const created = await createAssessmentInDb({
      title: title.trim(),
      description,
      code,
      instructions,
      duration: duration ? Number(duration) : 60,
      total_marks: total_marks ? Number(total_marks) : 100,
      passing_marks: passing_marks ? Number(passing_marks) : 40,
      start_time,
      end_time,
      status: status || 'draft',
      questions: questions || [],
    });

    return NextResponse.json({
      success: true,
      assessment: created,
    });
  } catch (error: any) {
    console.error('Create assessment error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create assessment' },
      { status: 500 }
    );
  }
}
