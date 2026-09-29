import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';
import { unarchiveAssessmentInDb } from '@/lib/turso';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Optional admin session check
    let adminName = 'admin';
    const adminCookie = req.cookies.get('jit_admin_session')?.value;
    if (adminCookie) {
      const session = await verifySessionToken(adminCookie);
      if (session && session.role === 'admin') {
        adminName = (session as any).username || session.id || 'admin';
      }
    }

    const body = await req.json().catch(() => ({}));
    const targetStatus = body.status || 'draft';

    const result = await unarchiveAssessmentInDb(id, targetStatus, adminName);

    return NextResponse.json({
      success: true,
      message: result.message,
      assessment: result.assessment,
      status: result.status,
      is_archived: false,
    });
  } catch (error: any) {
    console.error('Unarchive assessment error:', error);
    const statusCode = error?.status && typeof error.status === 'number' ? error.status : 500;
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to unarchive assessment' },
      { status: statusCode }
    );
  }
}
