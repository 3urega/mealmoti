import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'mealmoti_session';

export function middleware(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE_NAME);
  const isAuthRoute = request.nextUrl.pathname.startsWith('/app');
  const isPublicAuthRoute = 
    request.nextUrl.pathname === '/login' || 
    request.nextUrl.pathname === '/register';

  // Si es ruta protegida y no hay sesión, redirigir a login
  if (isAuthRoute && (!session || !session.value)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Si está autenticado y trata de acceder a login/register, redirigir a app
  if (session && session.value && isPublicAuthRoute) {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*', '/login', '/register'],
};


