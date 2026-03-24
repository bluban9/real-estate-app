import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/auth/login'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.startsWith('/icon') || pathname.startsWith('/apple-touch') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const authCookie = req.cookies.get('auth');
  if (authCookie?.value === process.env.AUTH_SECRET) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
