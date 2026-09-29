import { NextRequest, NextResponse } from 'next/server';
import { getTursoClient } from '@/lib/turso';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    const allowed = ['draft', 'scheduled', 'live', 'completed', 'closed', 'archived', 'unarchive'];
    if (!status || !allowed.includes(status.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Allowed values: ${allowed.join(', ')}` },
        { status: 400 }
      );
    }

    const client = getTursoClient();
    const now = new Date().toISOString();
    const normalizedStatus = status.toLowerCase() === 'unarchive' ? 'draft' : status.toLowerCase();
    const isArchived = normalizedStatus === 'archived' ? 1 : 0;

    await client.execute({
      sql: 'UPDATE tests SET status = ?, is_archived = ?, updated_at = ? WHERE id = ?',
      args: [normalizedStatus, isArchived, now, id],
    });

    return NextResponse.json({
      success: true,
      id,
      status: normalizedStatus,
      is_archived: isArchived === 1,
    });
  } catch (error: any) {
    console.error('Update status error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update assessment status' },
      { status: 500 }
    );
  }
}
