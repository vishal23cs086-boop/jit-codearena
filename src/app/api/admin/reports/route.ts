import { NextRequest, NextResponse } from 'next/server';
import { fetchAttemptReportsFromDb } from '@/lib/turso';

export async function GET(req: NextRequest) {
  try {
    const attempts = await fetchAttemptReportsFromDb();

    return NextResponse.json({
      success: true,
      count: attempts.length,
      attempts,
    });
  } catch (error: any) {
    console.error('Fetch reports attempts error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch reports data' },
      { status: 500 }
    );
  }
}
