import { NextRequest, NextResponse } from 'next/server';
import { getStudentsWithDetails, upsertStudentInDb, recordActivityLogInDb, findStudentByRegNo } from '@/lib/turso';

export async function GET() {
  try {
    const students = await getStudentsWithDetails();
    return NextResponse.json({
      success: true,
      count: students.length,
      students,
    });
  } catch (error: any) {
    console.error('Fetch students error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, registerNumber, department, year, section, phone, password } = body;

    const cleanRegNo = (registerNumber || '').trim().toUpperCase();
    if (!cleanRegNo || !fullName || !department || !year) {
      return NextResponse.json(
        { success: false, error: 'Full name, register number, department, and year are required.' },
        { status: 400 }
      );
    }

    const existing = await findStudentByRegNo(cleanRegNo);
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Student with Register Number ${cleanRegNo} is already registered.` },
        { status: 409 }
      );
    }

    const studentId = `std-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const email = `${cleanRegNo.toLowerCase()}@student.jit.edu`;

    await upsertStudentInDb({
      id: studentId,
      register_number: cleanRegNo,
      full_name: fullName.trim(),
      email,
      department: department.trim(),
      year: Number(year),
      section: section || 'A',
      phone: phone || '',
      password_hash: password || 'Student@123',
      status: 'active',
    });

    await recordActivityLogInDb({
      student_id: studentId,
      student_name: fullName.trim(),
      register_number: cleanRegNo,
      event_type: 'STUDENT_ENROLLED',
      description: `Administrator enrolled candidate ${cleanRegNo} (${fullName.trim()}) into department ${department}`,
      metadata: { department, year, section: section || 'A' },
    });

    return NextResponse.json({
      success: true,
      student: {
        id: studentId,
        email,
        full_name: fullName.trim(),
        role: 'student',
        register_number: cleanRegNo,
        department: department.trim(),
        year: Number(year),
        section: section || 'A',
        status: 'active',
        created_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Create student error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create student' },
      { status: 500 }
    );
  }
}
