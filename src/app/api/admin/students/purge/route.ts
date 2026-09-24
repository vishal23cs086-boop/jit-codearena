import { NextRequest, NextResponse } from 'next/server';
import { purgeAllStudentDataFromDb } from '@/lib/turso';

export async function POST(req: NextRequest) {
  try {
    const result = await purgeAllStudentDataFromDb();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Purge all student data error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to purge student data' },
      { status: 500 }
    );
  }
}

export { POST as DELETE };
