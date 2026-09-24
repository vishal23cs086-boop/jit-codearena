import { NextRequest, NextResponse } from 'next/server';
import { findStudentByRegNo, upsertStudentInDb, recordLoginActivityInDb, updateHeartbeatInDb } from '@/lib/turso';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, registerNumber, department, year, password, section, phone, email: customEmail } = body;

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
    const rawEmail = (customEmail || '').trim().toLowerCase();
    const email = rawEmail && rawEmail.includes('@') && rawEmail.includes('.')
      ? rawEmail
      : `${cleanRegNo.toLowerCase()}@student.jit.edu`;

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

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Browser';

    // Record login
    await recordLoginActivityInDb({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: studentId,
      user_role: 'student',
      register_number: cleanRegNo,
      full_name: fullName.trim(),
      ip_address: ip,
      user_agent: userAgent,
    });

    // Update presence
    await updateHeartbeatInDb({
      student_id: studentId,
      register_number: cleanRegNo,
      full_name: fullName.trim(),
      department: department.trim(),
      year: Number(year),
      section: section || 'A',
      current_page: '/student/dashboard',
      user_agent: userAgent,
      ip_address: ip,
    });

    const newStudent = {
      id: studentId,
      email,
      full_name: fullName.trim(),
      role: 'student' as const,
      register_number: cleanRegNo,
      department: department.trim(),
      year: Number(year),
      section: section || 'A',
      phone: phone || '',
      status: 'active' as const,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      user: newStudent,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error during student registration.' },
      { status: 500 }
    );
  }
}
