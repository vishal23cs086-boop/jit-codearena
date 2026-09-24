import { NextRequest, NextResponse } from 'next/server';
import { getLoginActivityFromDb } from '@/lib/turso';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;
    const logs = await getLoginActivityFromDb(limit);
    return NextResponse.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error: any) {
    console.error('Fetch login activity error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch login activity' },
      { status: 500 }
    );
  }
}
