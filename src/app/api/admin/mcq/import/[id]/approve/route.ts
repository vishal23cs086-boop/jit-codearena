import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';
import { approvePdfImportQuestionsInDb } from '@/lib/turso';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminCookie = req.cookies.get('jit_admin_session')?.value;
    if (!adminCookie) {
      return NextResponse.json({ success: false, error: 'Admin authentication required.' }, { status: 401 });
    }
    const session = await verifySessionToken(adminCookie);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const { id } = await context.params;
    let questionIds: string[] | undefined = undefined;

    try {
      const body = await req.json();
      if (Array.isArray(body?.questionIds) && body.questionIds.length > 0) {
        questionIds = body.questionIds;
      }
    } catch {
      // Approve all valid if body is empty
    }

    const result = await approvePdfImportQuestionsInDb(id, questionIds);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Approve MCQ questions error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to approve questions into Question Bank.' },
      { status: 500 }
    );
  }
}
