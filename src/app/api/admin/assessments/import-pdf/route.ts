import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';
import { parseMcqPdf } from '@/lib/pdf/mcqParser';
import { createPdfImportInDb, findDuplicateQuestionsInDb } from '@/lib/turso';
import { isAcademicYear } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Admin Session
    const adminCookie = req.cookies.get('jit_admin_session')?.value;
    if (!adminCookie) {
      return NextResponse.json({ success: false, error: 'Admin authentication required.' }, { status: 401 });
    }
    const session = await verifySessionToken(adminCookie);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    // 2. Parse Multipart Form Data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const yearParam = formData.get('academicYear') || formData.get('year');

    const academicYear = yearParam ? parseInt(String(yearParam), 10) : 2;
    if (!isAcademicYear(academicYear)) {
      return NextResponse.json(
        { success: false, error: 'Academic year must be 1, 2, 3 or 4 (1st to 4th Year).' },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No PDF file uploaded. Please attach a question paper PDF.' },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { success: false, error: 'Invalid file extension. Only .pdf files are supported.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Process PDF through Parser Pipeline
    const parsed = await parseMcqPdf(buffer, file.name, academicYear);
    if (!parsed.success && parsed.status === 'FAILED') {
      return NextResponse.json(
        { success: false, error: parsed.error_message || 'Failed to extract questions from PDF.' },
        { status: 400 }
      );
    }

    // 4. Duplicate Detection across Question Bank
    let duplicateCount = 0;
    for (const q of parsed.questions) {
      const dupCheck = await findDuplicateQuestionsInDb(q.question_text, academicYear);
      if (dupCheck.isDuplicate) {
        q.is_duplicate = 1;
        q.duplicate_of_id = dupCheck.duplicateId || null;
        if (q.status === 'VALID') {
          q.status = 'DUPLICATE';
          q.review_notes = `Potential duplicate of existing question: "${dupCheck.title}"`;
          duplicateCount++;
        }
      }
    }

    // 5. Persist to Turso Staging Tables
    const { importId } = await createPdfImportInDb({
      filename: file.name,
      uploaded_by: session.id || 'admin',
      academic_year: academicYear,
      total_pages: parsed.total_pages,
      questions_extracted: parsed.questions_extracted,
      answers_extracted: parsed.answers_extracted,
      valid_questions: parsed.valid_questions - duplicateCount,
      invalid_questions: parsed.invalid_questions + duplicateCount,
      status: parsed.status,
      error_message: parsed.error_message,
      questions: parsed.questions,
    });

    return NextResponse.json({
      success: true,
      importId,
      filename: file.name,
      academic_year: academicYear,
      total_pages: parsed.total_pages,
      questions_extracted: parsed.questions_extracted,
      answers_extracted: parsed.answers_extracted,
      valid_questions: parsed.valid_questions - duplicateCount,
      invalid_questions: parsed.invalid_questions + duplicateCount,
      duplicates_detected: duplicateCount,
      status: parsed.status,
      is_scanned_pdf: parsed.is_scanned_pdf,
      error_message: parsed.error_message,
    });
  } catch (error: any) {
    console.error('MCQ PDF upload/processing error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error while processing MCQ PDF.' },
      { status: 500 }
    );
  }
}
