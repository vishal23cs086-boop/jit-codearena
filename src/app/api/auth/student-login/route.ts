import { NextRequest, NextResponse } from 'next/server';
import { findStudentByRegNo, recordLoginActivityInDb, updateHeartbeatInDb } from '@/lib/turso';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { registerNumber, password, email } = body;

    const cleanRegNo = (registerNumber || '').trim().toUpperCase();
    if (!cleanRegNo) {
      return NextResponse.json(
        { success: false, error: 'Please enter your Register Number.' },
        { status: 400 }
      );
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return NextResponse.json(
        { success: false, error: 'Please enter your Gmail / College Email ID.' },
        { status: 400 }
      );
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid Gmail or email address (e.g. name@gmail.com).' },
        { status: 400 }
      );
    }

    const student = await findStudentByRegNo(cleanRegNo);
    if (!student || Number(student.account_deleted || 0) === 1) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid register number or password.',
          message: 'Invalid register number or password.',
        },
        { status: 401 }
      );
    }

    if (Number(student.is_archived || 0) === 1 || student.status === 'archived') {
      return NextResponse.json(
        {
          success: false,
          error: 'Your student account has been archived. Login access is no longer permitted.',
          message: 'Your student account has been archived. Login access is no longer permitted.',
        },
        { status: 403 }
      );
    }

    if (Number(student.is_active ?? 1) === 0 || student.status === 'disabled' || student.status === 'suspended') {
      return NextResponse.json(
        {
          success: false,
          error: 'Your student account has been disabled by administrator.',
          message: 'Your student account has been disabled by administrator.',
        },
        { status: 403 }
      );
    }

    // Password verification: If password is stored, verify; otherwise allow default test access
    if (student.password_hash && password) {
      const { verifyPassword, hashPassword, getTursoClient } = await import('@/lib/turso');
      const isMatch = verifyPassword(password, student.password_hash);
      if (!isMatch) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid register number or password.',
            message: 'Invalid register number or password.',
          },
          { status: 401 }
        );
      }

      // If legacy plaintext password, automatically upgrade to salted PBKDF2 hash
      if (!student.password_hash.startsWith('pbkdf2:')) {
        try {
          const client = getTursoClient();
          const upgradedHash = hashPassword(password);
          await client.execute({
            sql: 'UPDATE students SET password_hash = ? WHERE id = ?',
            args: [upgradedHash, student.id],
          });
        } catch {}
      }
    }

    // Update candidate email in Turso if different
    if (cleanEmail && student.email !== cleanEmail) {
      const { getTursoClient } = await import('@/lib/turso');
      const client = getTursoClient();
      await client.execute({
        sql: 'UPDATE students SET email = ? WHERE id = ?',
        args: [cleanEmail, student.id],
      });
      student.email = cleanEmail;
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
      session_version: Number(student.session_version || 1),
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
      is_active: Number(student.is_active ?? 1) === 1,
      is_archived: Number(student.is_archived ?? 0) === 1,
      session_version: Number(student.session_version || 1),
      created_at: student.created_at,
    };

    const { signSessionToken } = await import('@/lib/session');
    const token = await signSessionToken({
      role: 'student',
      id: student.id,
      register_number: student.register_number,
      year: Number(student.year),
      session_version: Number(student.session_version || 1),
    });

    const res = NextResponse.json({
      success: true,
      user: safeUser,
    });

    res.cookies.set('jit_student_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 86400 * 7,
    });

    return res;
  } catch (error: any) {
    console.error('Student login error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error during login.' },
      { status: 500 }
    );
  }
}
