import { NextResponse } from 'next/server';
import { fetchAttemptReportsFromDb } from '@/lib/turso';

export const dynamic = 'force-dynamic';

/**
 * All test attempts with student and test details (admin analytics & rankings).
 * Admin-only: /api/admin/* is protected by middleware.
 */
export async function GET() {
  try {
    const attempts = await fetchAttemptReportsFromDb();
    return NextResponse.json({ success: true, count: attempts.length, attempts });
  } catch (error: unknown) {
    console.error('Fetch attempts error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch attempts' }, { status: 500 });
  }
}
