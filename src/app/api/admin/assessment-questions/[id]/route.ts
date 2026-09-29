import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';
import { updatePdfImportQuestionInDb, deletePdfImportQuestionInDb, getTursoClient, initTursoDb } from '@/lib/turso';

export async function PUT(
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
    const body = await req.json();

    const qText = body.question_text !== undefined ? String(body.question_text).trim() : undefined;
    const optA = body.option_a !== undefined ? String(body.option_a).trim() : undefined;
    const optB = body.option_b !== undefined ? String(body.option_b).trim() : undefined;
    const optC = body.option_c !== undefined ? String(body.option_c).trim() : undefined;
    const optD = body.option_d !== undefined ? String(body.option_d).trim() : undefined;
    const correctAns = body.correct_answer !== undefined ? String(body.correct_answer).toUpperCase().trim() : undefined;
    const marks = body.marks !== undefined ? Number(body.marks) : undefined;

    // Check if the update resolves all required fields
    let newStatus = body.status;
    let newNotes = body.review_notes;

    if (
      qText && qText.length >= 5 &&
      optA && optB && optC && optD &&
      correctAns && ['A', 'B', 'C', 'D'].includes(correctAns) &&
      (marks === undefined || marks > 0)
    ) {
      newStatus = 'VALID';
      newNotes = null;
    }

    const updated = await updatePdfImportQuestionInDb(id, {
      question_text: qText,
      option_a: optA,
      option_b: optB,
      option_c: optC,
      option_d: optD,
      correct_answer: correctAns,
      marks: marks,
      status: newStatus,
      review_notes: newNotes,
    });

    // Also update main question bank if question exists there
    await initTursoDb();
    const client = getTursoClient();
    try {
      await client.execute({
        sql: `UPDATE questions 
              SET title = COALESCE(?, title),
                  description = COALESCE(?, description),
                  option_a = COALESCE(?, option_a),
                  option_b = COALESCE(?, option_b),
                  option_c = COALESCE(?, option_c),
                  option_d = COALESCE(?, option_d),
                  correct_option = COALESCE(?, correct_option),
                  marks = COALESCE(?, marks)
              WHERE id = ?`,
        args: [qText || null, qText || null, optA || null, optB || null, optC || null, optD || null, correctAns || null, marks || null, id],
      });
    } catch (e) {
      // Question might only exist in staging, which is fine
    }

    return NextResponse.json({
      success: true,
      question: updated,
    });
  } catch (error: any) {
    console.error('Update assessment question error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update question.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    await deletePdfImportQuestionInDb(id);

    return NextResponse.json({
      success: true,
      message: 'Question deleted successfully.',
    });
  } catch (error: any) {
    console.error('Delete assessment question error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete question.' },
      { status: 500 }
    );
  }
}
