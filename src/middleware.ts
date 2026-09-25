import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Admin login page: If already logged in as admin, redirect to /admin/dashboard
  if (pathname === '/admin/login') {
    const adminToken = req.cookies.get('jit_admin_session')?.value;
    if (adminToken) {
      const payload = await verifySessionToken(adminToken);
      if (payload && payload.role === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', req.url));
      }
    }
    return NextResponse.next();
  }

  // 2. Base /admin path: Redirect to dashboard if logged in, or login if not
  if (pathname === '/admin') {
    const adminToken = req.cookies.get('jit_admin_session')?.value;
    if (adminToken) {
      const payload = await verifySessionToken(adminToken);
      if (payload && payload.role === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', req.url));
      }
    }
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  // 3. Admin Protected Pages: /admin/dashboard, /admin/monitor, /admin/students, etc.
  if (pathname.startsWith('/admin/')) {
    const adminToken = req.cookies.get('jit_admin_session')?.value;
    if (!adminToken) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const payload = await verifySessionToken(adminToken);
    if (!payload || payload.role !== 'admin') {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // 4. Admin API Routes: /api/admin/*
  if (pathname.startsWith('/api/admin/')) {
    let token = req.cookies.get('jit_admin_session')?.value;

    // Check for Bearer token fallback in headers
    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin authentication required.' },
        { status: 401 }
      );
    }

    const payload = await verifySessionToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Valid administrator session required.' },
        { status: 403 }
      );
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};
