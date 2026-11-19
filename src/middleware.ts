import { NextResponse, type NextRequest } from 'next/server';

/**
 * Serves the static advent calendar (public/advent.html) at the site root,
 * tixo.com/advent. next.config rewrites can't target paths outside basePath,
 * so this is done here instead.
 */
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/advent' && request.nextUrl.basePath === '') {
    return NextResponse.rewrite(new URL('/fun/advent.html', request.url));
  }
  return NextResponse.next();
}
