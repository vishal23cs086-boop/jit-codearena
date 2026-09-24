import { NextRequest, NextResponse } from 'next/server';
import { setStudentStatus } from '@/lib/turso';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !['active', 'disabled', 'archived'].includes(status.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Allowed values: active, disabled, archived' },
        { status: 400 }
      );
    }

    const result = await setStudentStatus(
      id,
      status.toLowerCase() as 'active' | 'disabled' | 'archived',
      { name: 'Admin Controller', role: 'admin' }
    );

    return NextResponse.json({
      success: true,
      message: `Account status updated to ${status.toUpperCase()}.`,
      result,
    });
  } catch (error: any) {
    console.error('Update student status error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update student status' },
      { status: 500 }
    );
  }
}

export { POST as PATCH };
