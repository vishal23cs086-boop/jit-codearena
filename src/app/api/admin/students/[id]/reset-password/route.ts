import { NextRequest, NextResponse } from 'next/server';
import { resetStudentPassword } from '@/lib/turso';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.trim().length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    await resetStudentPassword(id, newPassword.trim(), {
      name: 'Admin Controller',
      role: 'admin',
    });

    return NextResponse.json({
      success: true,
      message: 'Student password has been securely reset.',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to reset password' },
      { status: 500 }
    );
  }
}
