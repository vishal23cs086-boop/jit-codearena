import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';
import { getPdfImportFromDb, getPdfImportQuestionsFromDb } from '@/lib/turso';

export async function GET(
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
    if (!id) {
      return NextResponse.json({ success: false, error: 'Import ID is required.' }, { status: 400 });
    }

    const imp = await getPdfImportFromDb(id);
    if (!imp) {
      return NextResponse.json({ success: false, error: 'Import record not found.' }, { status: 404 });
    }

    const questions = await getPdfImportQuestionsFromDb(id);

    return NextResponse.json({
      success: true,
      import: imp,
      questions,
    });
  } catch (error: any) {
    console.error('Fetch MCQ import error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch MCQ import details.' },
      { status: 500 }
    );
  }
}
