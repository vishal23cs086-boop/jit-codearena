import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';
import { getPdfImportFromDb, getPdfImportQuestionsFromDb } from '@/lib/turso';

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

    const body = await req.json().catch(() => ({}));
    const importId = body.importId || req.nextUrl.searchParams.get('importId');

    if (!importId) {
      return NextResponse.json({ success: false, error: 'importId is required.' }, { status: 400 });
    }

    const imp = await getPdfImportFromDb(importId);
    if (!imp) {
      return NextResponse.json({ success: false, error: 'Import record not found.' }, { status: 404 });
    }

    const questions = await getPdfImportQuestionsFromDb(importId);

    const validQuestions = questions.filter((q) => q.status === 'VALID' || q.status === 'APPROVED').length;
    const needsReview = questions.filter((q) => q.status === 'NEEDS_REVIEW' || q.status === 'DUPLICATE').length;
    const totalMarks = questions.reduce((acc, q) => acc + (q.marks || 2), 0);

    return NextResponse.json({
      success: true,
      import: imp,
      questions,
      summary: {
        total_questions: questions.length,
        valid_questions: validQuestions,
        needs_review: needsReview,
        total_marks: totalMarks,
        academic_year: imp.academic_year,
        ready_to_publish: needsReview === 0 && questions.length > 0,
      },
    });
  } catch (error: any) {
    console.error('Import preview error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch import preview.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Convenience fallback for GET
  return POST(req);
}
