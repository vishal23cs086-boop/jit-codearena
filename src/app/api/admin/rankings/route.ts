import { NextRequest, NextResponse } from 'next/server';
import { getAssessmentRankingsFromDb } from '@/lib/turso';
import { verifySessionToken } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const testId = searchParams.get('testId') || undefined;
    const yearStr = searchParams.get('year');
    const year = yearStr && !isNaN(Number(yearStr)) ? Number(yearStr) : undefined;
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;

    const rankings = await getAssessmentRankingsFromDb({
      testId,
      year,
      search,
      status,
    });

    return NextResponse.json({
      success: true,
      count: rankings.length,
      rankings,
    });
  } catch (error: any) {
    console.error('Fetch rankings error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch assessment rankings' },
      { status: 500 }
    );
  }
}
