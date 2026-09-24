import { NextRequest, NextResponse } from 'next/server';
import { duplicateAssessmentInDb } from '@/lib/turso';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const duplicated = await duplicateAssessmentInDb(id);
    return NextResponse.json({
      success: true,
      assessment: duplicated,
    });
  } catch (error: any) {
    console.error('Duplicate assessment error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to duplicate assessment' },
      { status: 500 }
    );
  }
}
