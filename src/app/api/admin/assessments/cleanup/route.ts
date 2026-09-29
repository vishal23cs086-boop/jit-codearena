import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';
import { cleanupAssessmentsAndQuestionsInDb } from '@/lib/turso';

export async function POST(req: NextRequest) {
  try {
    let adminName = 'admin';
    const adminCookie = req.cookies.get('jit_admin_session')?.value;
    if (adminCookie) {
      const session = await verifySessionToken(adminCookie);
      if (session && session.role === 'admin') {
        adminName = (session as any).username || session.id || 'admin';
      }
    }

    const body = await req.json().catch(() => ({}));
    const target = body.target || 'draft_tests';

    if (target !== 'draft_tests' && target !== 'unused_questions') {
      return NextResponse.json(
        { success: false, error: 'target must be "draft_tests" or "unused_questions"' },
        { status: 400 }
      );
    }

    const result = await cleanupAssessmentsAndQuestionsInDb({
      target,
      adminName,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Data cleanup error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to execute safe cleanup' },
      { status: 500 }
    );
  }
}
