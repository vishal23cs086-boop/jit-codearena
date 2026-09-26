import { NextRequest, NextResponse } from 'next/server';
import { getQuestionByIdFromDb, updateQuestionInDb, deleteQuestionInDb } from '@/lib/turso';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const question = await getQuestionByIdFromDb(id);
    if (!question) {
      return NextResponse.json({ success: false, error: 'Question not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, question });
  } catch (error: any) {
    console.error('Get question error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch question' },
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
    if (body.academic_year !== undefined && body.year === undefined) {
      body.year = body.academic_year;
    }
    if (body.starter_code !== undefined && body.initial_code === undefined) {
      body.initial_code = body.starter_code;
    }

    if (body.year !== undefined) {
      const y = Number(body.year);
      if (y !== 2 && y !== 3) {
        return NextResponse.json(
          { success: false, error: 'Academic year must be 2 (2nd Year) or 3 (3rd Year).' },
          { status: 400 }
        );
      }
    }

    if (body.difficulty !== undefined) {
      const diffUpper = String(body.difficulty).toUpperCase();
      if (!['EASY', 'MEDIUM', 'HARD'].includes(diffUpper)) {
        return NextResponse.json(
          { success: false, error: 'Difficulty must be EASY, MEDIUM, or HARD.' },
          { status: 400 }
        );
      }
      body.difficulty = diffUpper.charAt(0) + diffUpper.slice(1).toLowerCase();
    }

    if (body.marks !== undefined) {
      const parsedMarks = Number(body.marks);
      if (isNaN(parsedMarks) || parsedMarks <= 0) {
        return NextResponse.json(
          { success: false, error: 'Marks must be a positive number greater than 0.' },
          { status: 400 }
        );
      }
      body.marks = parsedMarks;
    }

    if (body.test_cases !== undefined && !Array.isArray(body.test_cases)) {
      return NextResponse.json(
        { success: false, error: 'Test cases must be a valid array.' },
        { status: 400 }
      );
    }

    const updated = await updateQuestionInDb(id, body);
    return NextResponse.json({ success: true, question: updated });
  } catch (error: any) {
    console.error('Update question error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update question' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await deleteQuestionInDb(id);
    return NextResponse.json({
      success: true,
      archived: result.archived,
      deleted: result.deleted,
      message: result.message || 'Question processed successfully',
    });
  } catch (error: any) {
    console.error('Delete question error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete question' },
      { status: 500 }
    );
  }
}
