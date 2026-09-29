import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';
import {
  createMcqAssessmentInDb,
  approvePdfImportQuestionsInDb,
  getPdfImportQuestionsFromDb,
  getPdfImportFromDb,
} from '@/lib/turso';

export async function POST(req: NextRequest) {
  try {
    const adminCookie = req.cookies.get('jit_admin_session')?.value;
    if (!adminCookie) {
      return NextResponse.json({ success: false, error: 'Admin authentication required.' }, { status: 401 });
    }
    const session = await verifySessionToken(adminCookie);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const body = await req.json();
    const importId = body.importId || body.import_id;

    if (!importId) {
      return NextResponse.json({ success: false, error: 'importId is required.' }, { status: 400 });
    }

    const imp = await getPdfImportFromDb(importId);
    if (!imp) {
      return NextResponse.json({ success: false, error: 'Import record not found.' }, { status: 404 });
    }

    // Check if questions are valid
    const stagedQuestions = await getPdfImportQuestionsFromDb(importId);
    const unapproved = stagedQuestions.filter((q) => q.status !== 'APPROVED' && q.status !== 'REJECTED');
    const needsReview = stagedQuestions.filter((q) => q.status === 'NEEDS_REVIEW' || q.status === 'DUPLICATE');

    if (needsReview.length > 0 && !body.allow_override) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot create assessment: ${needsReview.length} question(s) still require review. Please review all questions or validate before creating.`,
          unresolved_count: needsReview.length,
        },
        { status: 400 }
      );
    }

    // 1. Approve questions into the question bank
    let createdQuestionIds: string[] = [];
    if (unapproved.length > 0) {
      const approveRes = await approvePdfImportQuestionsInDb(
        importId,
        unapproved.map((q) => q.id)
      );
      createdQuestionIds = approveRes.createdQuestionIds;
    }

    // 2. Create the MCQ Assessment
    const assessment = await createMcqAssessmentInDb({
      title: body.title || `MCQ Assessment – Year ${imp.academic_year}`,
      code: body.code || `JIT-Y${imp.academic_year}-MCQ-${Math.floor(1000 + Math.random() * 9000)}`,
      description: body.description || `30 MCQs Assessment, 2 marks each (Total 60 Marks).`,
      instructions: body.instructions || `Select one answer (A-D). Python 3.x syntax. Server-side evaluation.`,
      year: Number(body.year || imp.academic_year || 2),
      duration_minutes: body.duration_minutes ? Number(body.duration_minutes) : 60,
      question_count: body.question_count ? Number(body.question_count) : stagedQuestions.length,
      marks_per_question: body.marks_per_question ? Number(body.marks_per_question) : 2,
      passing_marks: body.passing_marks ? Number(body.passing_marks) : Math.round(stagedQuestions.length * 2 * 0.4),
      start_time: body.start_time,
      end_time: body.end_time,
      status: body.status || 'published',
      import_id: importId,
      question_ids: createdQuestionIds.length > 0 ? createdQuestionIds : undefined,
    });

    return NextResponse.json({
      success: true,
      assessment,
    });
  } catch (error: any) {
    console.error('Create assessment error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create assessment.' },
      { status: 500 }
    );
  }
}
