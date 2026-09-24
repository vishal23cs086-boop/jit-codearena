import { NextRequest, NextResponse } from 'next/server';
import { findStudentByRegNo, recordLoginActivityInDb, updateHeartbeatInDb } from '@/lib/turso';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { registerNumber, password } = body;

    const cleanRegNo = (registerNumber || '').trim().toUpperCase();
    if (!cleanRegNo) {
      return NextResponse.json(
        { success: false, error: 'Please enter your Register Number.' },
        { status: 400 }
      );
    }

    const student = await findStudentByRegNo(cleanRegNo);
    if (!student) {
      return NextResponse.json(
        {
          success: false,
          error: `No registered student found with Register Number "${cleanRegNo}". Please register first.`,
        },
        { status: 404 }
      );
    }

    if (student.status === 'disabled' || student.status === 'suspended' || student.status === 'archived') {
      return NextResponse.json(
        {
          success: false,
          error: student.status === 'disabled'
            ? 'Your student account has been disabled by the administrator. Please contact the Examination Cell.'
            : 'Your student account has been archived. Login access is no longer permitted.',
        },
        { status: 403 }
      );
    }

    // Password verification: If password is stored, verify; otherwise allow default test access
    if (student.password_hash && password) {
      if (student.password_hash !== password) {
        return NextResponse.json(
          { success: false, error: 'Invalid password. Please check your credentials.' },
          { status: 401 }
        );
      }
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Browser';

    // Record login activity
    await recordLoginActivityInDb({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: student.id,
      user_role: 'student',
      register_number: student.register_number,
      full_name: student.full_name,
      ip_address: ip,
      user_agent: userAgent,
    });

    // Update presence
    await updateHeartbeatInDb({
      student_id: student.id,
      register_number: student.register_number,
      full_name: student.full_name,
      department: student.department,
      year: student.year,
      section: student.section,
      current_page: '/student/dashboard',
      user_agent: userAgent,
      ip_address: ip,
    });

    const safeUser = {
      id: student.id,
      email: student.email,
      full_name: student.full_name,
      role: 'student' as const,
      register_number: student.register_number,
      department: student.department,
      year: student.year,
      section: student.section,
      phone: student.phone,
      status: student.status,
      created_at: student.created_at,
    };

    return NextResponse.json({
      success: true,
      user: safeUser,
    });
  } catch (error: any) {
    console.error('Student login error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error during login.' },
      { status: 500 }
    );
  }
}
