import { NextRequest, NextResponse } from 'next/server';
import { migrateQuestionsToThreeTestCasesAndCleanStarterCode } from '@/lib/turso';

export async function POST(req: NextRequest) {
  try {
    const result = await migrateQuestionsToThreeTestCasesAndCleanStarterCode();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Migrate questions error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to migrate questions' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/admin/questions/migrate',
    description: 'Enforces exactly 3 test cases across all questions and cleanses unintended starter code.',
  });
}
