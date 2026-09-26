import { NextRequest, NextResponse } from 'next/server';
import { replaceStudentsWithRoster } from '@/lib/turso';
import { OFFICIAL_CSE_ROSTER } from '@/lib/officialRoster';

export async function POST(req: NextRequest) {
  try {
    let roster = [...OFFICIAL_CSE_ROSTER];
    try {
      const body = await req.json();
      if (body && Array.isArray(body.students) && body.students.length > 0) {
        roster = body.students;
      }
    } catch {
      // Default to official roster if body is empty or not JSON
    }

    const result = await replaceStudentsWithRoster(roster as any, {
      name: 'Administrator',
      role: 'admin',
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Replace roster error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to replace student roster' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    total_roster_students: OFFICIAL_CSE_ROSTER.length,
    department: 'CSE',
    year: 2,
    sample: OFFICIAL_CSE_ROSTER.slice(0, 5),
  });
}
