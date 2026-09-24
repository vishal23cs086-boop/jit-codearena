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

    if (body.year !== undefined) {
      const y = Number(body.year);
      if (y !== 2 && y !== 3) {
        return NextResponse.json(
          { success: false, error: 'Academic year must be 2 (2nd Year) or 3 (3rd Year).' },
          { status: 400 }
        );
      }
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
    await deleteQuestionInDb(id);
    return NextResponse.json({ success: true, message: 'Question deleted successfully' });
  } catch (error: any) {
    console.error('Delete question error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete question' },
      { status: 500 }
    );
  }
}
