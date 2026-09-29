import { NextRequest, NextResponse } from 'next/server';
import { getDashboardStatsFromDb } from '@/lib/turso';

export async function GET(req: NextRequest) {
  try {
    const assessmentId = req.nextUrl.searchParams.get('assessmentId') || 'global';
    const stats = await getDashboardStatsFromDb(assessmentId);
    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('Fetch dashboard stats error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
