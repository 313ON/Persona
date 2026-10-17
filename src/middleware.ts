import { NextRequest, NextResponse } from 'next/server';
import { contentSecurityPolicyForNonce, newCspNonce } from './lib/security';

export default function middleware(request: NextRequest) {
  const nonce = newCspNonce();
  const contentSecurityPolicy = contentSecurityPolicyForNonce(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  return response;
}

export const config = {
  runtime: 'nodejs',
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
