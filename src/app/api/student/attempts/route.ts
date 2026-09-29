import { NextRequest, NextResponse } from 'next/server';
import { fetchAttemptReportsFromDb } from '@/lib/turso';
import { getStudentSession } from '@/lib/session';

/**
 * The logged-in student's own test attempts (dashboard & analytics).
 */
export async function GET(req: NextRequest) {
  try {
    // Identity comes only from the signed session cookie
    const session = await getStudentSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Authentication required. Please log in.' }, { status: 401 });
    }

    const attempts = await fetchAttemptReportsFromDb(session.id);

    return NextResponse.json({
      success: true,
      count: attempts.length,
      attempts,
    });
  } catch (error: unknown) {
    console.error('Fetch student attempts error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch your attempts' },
      { status: 500 }
    );
  }
}
