import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';
import { createMcqAssessmentInDb, approvePdfImportQuestionsInDb, getPdfImportQuestionsFromDb } from '@/lib/turso';

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
    const body = await req.json();

    // 1. If questions in staging haven't been approved yet, approve them first
    const stagedQuestions = await getPdfImportQuestionsFromDb(id);
    const unapproved = stagedQuestions.filter((q) => q.status !== 'APPROVED' && q.status !== 'REJECTED');
    let createdQuestionIds: string[] = [];

    if (unapproved.length > 0) {
      const approveRes = await approvePdfImportQuestionsInDb(id, unapproved.map((q) => q.id));
      createdQuestionIds = approveRes.createdQuestionIds;
    }

    // 2. Create the MCQ Assessment
    const assessment = await createMcqAssessmentInDb({
      title: body.title,
      code: body.code,
      description: body.description,
      instructions: body.instructions,
      year: Number(body.year || 2),
      duration_minutes: body.duration_minutes ? Number(body.duration_minutes) : 60,
      question_count: body.question_count ? Number(body.question_count) : 30,
      marks_per_question: body.marks_per_question ? Number(body.marks_per_question) : 2,
      passing_marks: body.passing_marks ? Number(body.passing_marks) : undefined,
      start_time: body.start_time,
      end_time: body.end_time,
      status: body.status || 'published',
      import_id: id,
      question_ids: createdQuestionIds.length > 0 ? createdQuestionIds : undefined,
    });

    return NextResponse.json({
      success: true,
      assessment,
    });
  } catch (error: any) {
    console.error('Create MCQ assessment error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create MCQ assessment.' },
      { status: 500 }
    );
  }
}
