import { NextRequest, NextResponse } from 'next/server';
import { getQuestionsFromDb, createQuestionInDb, getQuestionPoolStats } from '@/lib/turso';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statsOnly = searchParams.get('stats') === 'true';

    if (statsOnly) {
      const stats = await getQuestionPoolStats();
      return NextResponse.json({ success: true, stats });
    }

    const yearParam = searchParams.get('year');
    const year = yearParam ? Number(yearParam) : undefined;
    const topic = searchParams.get('topic') || undefined;
    const difficulty = searchParams.get('difficulty') || undefined;

    const questions = await getQuestionsFromDb({ year, topic, difficulty });
    const stats = await getQuestionPoolStats();

    return NextResponse.json({
      success: true,
      count: questions.length,
      stats,
      questions,
    });
  } catch (error: any) {
    console.error('Fetch questions error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch questions' },
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
      year,
      difficulty,
      topic,
      marks,
      initial_code,
      solution_code,
      test_cases,
      time_limit,
      memory_limit,
      input_format,
      output_format,
      constraints,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: 'Question title is required.' },
        { status: 400 }
      );
    }

    const parsedYear = Number(year);
    if (parsedYear !== 2 && parsedYear !== 3) {
      return NextResponse.json(
        { success: false, error: 'Academic year must be 2 (2nd Year) or 3 (3rd Year).' },
        { status: 400 }
      );
    }

    const created = await createQuestionInDb({
      title: title.trim(),
      description: description || '',
      year: parsedYear,
      difficulty: difficulty || 'Easy',
      topic: topic || 'Algorithms',
      marks: marks ? Number(marks) : 20,
      initial_code: initial_code || 'def solution():\n    pass\n',
      solution_code: solution_code || '',
      test_cases: Array.isArray(test_cases) ? test_cases : [],
      time_limit: time_limit ? Number(time_limit) : 2000,
      memory_limit: memory_limit ? Number(memory_limit) : 128,
      input_format: input_format || '',
      output_format: output_format || '',
      constraints: constraints || '',
    });

    return NextResponse.json({
      success: true,
      question: created,
    });
  } catch (error: any) {
    console.error('Create question error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create question' },
      { status: 500 }
    );
  }
}
