import { NextRequest, NextResponse } from 'next/server';
import { getDashboardDrilldownFromDb } from '@/lib/turso';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || 'students';

    const records = await getDashboardDrilldownFromDb(category);

    return NextResponse.json({
      success: true,
      category,
      count: records.length,
      records,
    });
  } catch (error: any) {
    console.error('Fetch dashboard drill-down error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch drill-down records' },
      { status: 500 }
    );
  }
}
