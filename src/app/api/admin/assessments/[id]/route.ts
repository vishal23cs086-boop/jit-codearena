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

    const result = await updateAssessmentInDb(id, body);
    return NextResponse.json({
      success: true,
      assessment: result.assessment,
      had_active_attempts: result.had_active_attempts,
    });
  } catch (error: any) {
    console.error('Update assessment error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update assessment' },
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
