import { NextRequest, NextResponse } from 'next/server';
import { checkStudentExamHistory } from '@/lib/turso';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const history = await checkStudentExamHistory(id);
    return NextResponse.json({
      success: true,
      ...history,
    });
  } catch (error: any) {
    console.error('Check student history error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to check student history' },
      { status: 500 }
    );
  }
}
