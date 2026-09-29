import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';
import { validatePdfImportInDb } from '@/lib/turso';

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

    const validationResult = await validatePdfImportInDb(importId);

    return NextResponse.json({
      success: true,
      ...validationResult,
    });
  } catch (error: any) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to validate questions.' },
      { status: 500 }
    );
  }
}
