import { NextRequest, NextResponse } from 'next/server';
import { getStudentProfileDetails, updateStudentDetails, deleteOrArchiveStudentInDb } from '@/lib/turso';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profile = await getStudentProfileDetails(id);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error: any) {
    console.error('Fetch student profile error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch student profile' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { full_name, register_number, department, year, section } = body;

    const updated = await updateStudentDetails(
      id,
      { full_name, register_number, department, year, section },
      { name: 'Admin Controller', role: 'admin' }
    );

    return NextResponse.json({
      success: true,
      message: 'Student details updated successfully.',
      student: updated,
    });
  } catch (error: any) {
    console.error('Update student error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update student details' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await deleteOrArchiveStudentInDb(id, { name: 'Admin Controller', role: 'admin' });
    return NextResponse.json({
      success: true,
      action: result.action,
      message: result.message,
    });
  } catch (error: any) {
    console.error('Delete student error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete or archive student' },
      { status: 500 }
    );
  }
}
