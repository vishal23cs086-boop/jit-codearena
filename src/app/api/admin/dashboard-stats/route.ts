import { NextResponse } from 'next/server';
import { getDashboardStatsFromDb } from '@/lib/turso';

export async function GET() {
  try {
    const stats = await getDashboardStatsFromDb();
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
