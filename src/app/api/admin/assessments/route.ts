import { NextRequest, NextResponse } from 'next/server';
import { getAssessmentsFromDb, createAssessmentInDb, getQuestionsFromDb } from '@/lib/turso';

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
      instructions,
      duration,
      total_marks,
      passing_marks,
      start_time,
      end_time,
      status,
      year,
      question_count,
      questions,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: 'Assessment title is required.' },
        { status: 400 }
      );
    }

    const parsedYear = Number(year) === 3 ? 3 : 2;
    const parsedCount = Number(question_count || 0);

    // Validate available questions in pool if a specific count is required
    if (parsedCount > 0) {
      const pool = await getQuestionsFromDb({ year: parsedYear });
      const attachedCount = Array.isArray(questions) ? questions.length : 0;
      const totalAvailable = Math.max(pool.length, attachedCount);
      if (totalAvailable < parsedCount) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient questions for this assessment. Required: ${parsedCount}. Available for ${parsedYear === 2 ? '2nd' : '3rd'} Year: ${totalAvailable}.`,
          },
          { status: 400 }
        );
      }
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
      year: parsedYear,
      question_count: parsedCount,
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
