import { NextRequest, NextResponse } from 'next/server';
import { recordLoginActivityInDb } from '@/lib/turso';
import { signSessionToken } from '@/lib/session';
import crypto from 'crypto';

// Constant-time string comparison so response timing doesn't leak how much of a credential matched
function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    // Credentials come only from the environment; there are no built-in defaults
    const expectedUser = (process.env.ADMIN_USERNAME || '').trim().replace(/^["']|["']$/g, '').toUpperCase();
    const expectedPass = (process.env.ADMIN_PASSWORD || '').trim().replace(/^["']|["']$/g, '');

    if (!expectedUser || !expectedPass) {
      console.error('Admin login is disabled: ADMIN_USERNAME and ADMIN_PASSWORD must be set.');
      return NextResponse.json(
        { success: false, error: 'Administrator login is not configured on this server.' },
        { status: 503 }
      );
    }

    const cleanInputUser = (typeof username === 'string' ? username : '').trim().toUpperCase();
    const inputPass = typeof password === 'string' ? password : '';

    const isUserMatch = safeEqual(cleanInputUser, expectedUser);
    const isPassMatch = safeEqual(inputPass, expectedPass);

    if (!isUserMatch || !isPassMatch) {
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

    // Create secure signed session token
    const token = await signSessionToken({
      role: 'admin',
      id: adminUser.id,
      register_number: 'ADMIN',
    });

    const res = NextResponse.json({
      success: true,
      user: adminUser,
    });

    // Set secure HTTP-only cookie
    res.cookies.set('jit_admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 86400 * 7,
    });

    return res;
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error during authentication.' },
      { status: 500 }
    );
  }
}
