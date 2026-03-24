import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function hashPassword(password: string): string {
  return crypto.pbkdf2Sync(password, 'bs-finance-salt-2026', 100000, 64, 'sha512').toString('hex');
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const validEmail = process.env.AUTH_EMAIL;
  const validHash = process.env.AUTH_PASSWORD_HASH;

  if (!email || !password) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  }

  const inputHash = hashPassword(password);
  const emailMatch = email.toLowerCase() === validEmail?.toLowerCase();
  const passwordMatch = inputHash === validHash;

  if (!emailMatch || !passwordMatch) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('auth', process.env.AUTH_SECRET!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  return response;
}
