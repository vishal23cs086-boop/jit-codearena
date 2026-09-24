import { NextRequest, NextResponse } from 'next/server';
import { recordLoginActivityInDb } from '@/lib/turso';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    const expectedUser = (process.env.ADMIN_USERNAME || 'ADMIN').trim().toUpperCase();
    const expectedPass = process.env.ADMIN_PASSWORD || 'Admin_Jansons';

    const inputUser = (username || '').trim().toUpperCase();
    const isUserMatch =
      inputUser === expectedUser ||
      inputUser === 'ADMIN@JIT.EDU' ||
      inputUser === 'EXAMCELL@JIT.EDU.IN';

    if (!isUserMatch || password !== expectedPass) {
      return NextResponse.json(
        { success: false, error: 'Invalid Administrator credentials.' },
        { status: 401 }
      );
    }

    const adminUser = {
      id: 'admin-controller',
      email: 'admin@jit.edu.in',
      full_name: 'Examination Controller (Jansons)',
      role: 'admin',
      register_number: 'ADMIN',
      department: 'EXAM_CELL',
      year: 0,
      status: 'active',
    };

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Browser';

    await recordLoginActivityInDb({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: adminUser.id,
      user_role: 'admin',
      register_number: 'ADMIN',
      full_name: adminUser.full_name,
      ip_address: ip,
      user_agent: userAgent,
    });

    return NextResponse.json({
      success: true,
      user: adminUser,
    });
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error during authentication.' },
      { status: 500 }
    );
  }
}
