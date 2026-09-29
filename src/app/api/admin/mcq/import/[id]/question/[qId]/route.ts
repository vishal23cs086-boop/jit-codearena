import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';
import { updatePdfImportQuestionInDb } from '@/lib/turso';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string; qId: string }> }
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

    const { id, qId } = await context.params;
    const body = await req.json();

    const updated = await updatePdfImportQuestionInDb(qId, {
      question_text: body.question_text,
      option_a: body.option_a,
      option_b: body.option_b,
      option_c: body.option_c,
      option_d: body.option_d,
      correct_answer: body.correct_answer,
      marks: body.marks,
      status: body.status,
      review_notes: body.review_notes,
    });

    return NextResponse.json({
      success: true,
      question: updated,
    });
  } catch (error: any) {
    console.error('Update MCQ staged question error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update question.' },
      { status: 500 }
    );
  }
}
