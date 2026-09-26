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
      poolStats: stats,
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
      academic_year,
      difficulty,
      topic,
      marks,
      initial_code,
      starter_code,
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

    const rawYear = year !== undefined ? year : academic_year;
    const parsedYear = Number(rawYear);
    if (parsedYear !== 2 && parsedYear !== 3) {
      return NextResponse.json(
        { success: false, error: 'Academic year must be 2 (2nd Year) or 3 (3rd Year).' },
        { status: 400 }
      );
    }

    const diffUpper = String(difficulty || 'Medium').toUpperCase();
    if (!['EASY', 'MEDIUM', 'HARD'].includes(diffUpper)) {
      return NextResponse.json(
        { success: false, error: 'Difficulty must be EASY, MEDIUM, or HARD.' },
        { status: 400 }
      );
    }
    const normalizedDifficulty = diffUpper.charAt(0) + diffUpper.slice(1).toLowerCase();

    const parsedMarks = Number(marks !== undefined ? marks : 20);
    if (isNaN(parsedMarks) || parsedMarks <= 0) {
      return NextResponse.json(
        { success: false, error: 'Marks must be a positive number greater than 0.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(test_cases) || test_cases.length !== 3) {
      return NextResponse.json(
        { success: false, error: 'Every coding question must have exactly 3 test cases.' },
        { status: 400 }
      );
    }

    for (let i = 0; i < 3; i++) {
      const tc = test_cases[i];
      if (!tc || typeof tc.expected_output !== 'string' || !tc.expected_output.trim()) {
        return NextResponse.json(
          { success: false, error: `Test Case ${i + 1} Expected Output is required.` },
          { status: 400 }
        );
      }
    }

    const codeToUse = starter_code !== undefined ? starter_code : (initial_code || '');

    const created = await createQuestionInDb({
      title: title.trim(),
      description: description || '',
      year: parsedYear,
      difficulty: normalizedDifficulty,
      topic: topic || 'Algorithms',
      marks: parsedMarks,
      starter_code: codeToUse,
      initial_code: codeToUse,
      solution_code: solution_code || '',
      test_cases,
      time_limit: time_limit ? Number(time_limit) : 2000,
      memory_limit: memory_limit ? Number(memory_limit) : 128,
      input_format: input_format || '',
      output_format: output_format || '',
      constraints: constraints || '',
    });

    return NextResponse.json({
      success: true,
      question: created,
      questionId: created?.id,
    });
  } catch (error: any) {
    console.error('Create question error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create question' },
      { status: 500 }
    );
  }
}
