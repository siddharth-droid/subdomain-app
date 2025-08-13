import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl;

  let subdomain = '';
  
  const devDomain = process.env.NEXT_PUBLIC_DEV_DOMAIN;
  const prodDomain = process.env.NEXT_PUBLIC_PROD_DOMAIN;
  
  if (devDomain && hostname.includes(devDomain)) {
    subdomain = hostname.split(devDomain)[0];
  } else if (prodDomain && hostname.includes(prodDomain)) {
    subdomain = hostname.split(prodDomain)[0];
  }

  if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
    const response = NextResponse.next();
    response.headers.set('x-subdomain', subdomain);
    response.headers.set('x-hostname', hostname);
    
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};