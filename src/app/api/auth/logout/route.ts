import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ success: true, message: 'Logged out successfully.' });
  res.cookies.delete('jit_admin_session');
  res.cookies.delete('jit_student_session');
  return res;
}
