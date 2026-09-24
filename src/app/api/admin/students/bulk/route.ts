import { NextRequest, NextResponse } from 'next/server';
import { bulkUpdateStudentsInDb } from '@/lib/turso';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentIds, action } = body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No students selected for bulk operation.' },
        { status: 400 }
      );
    }

    if (!['disable', 'enable', 'archive'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid bulk action. Allowed: disable, enable, archive' },
        { status: 400 }
      );
    }

    const result = await bulkUpdateStudentsInDb(studentIds, action, {
      name: 'Admin Controller',
      role: 'admin',
    });

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${result.count} students.`,
      result,
    });
  } catch (error: any) {
    console.error('Bulk student operation error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to execute bulk operation' },
      { status: 500 }
    );
  }
}
