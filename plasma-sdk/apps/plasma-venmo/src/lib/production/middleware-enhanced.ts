import { NextRequest, NextResponse } from 'next/server';

/**
 * @name Middleware
 * @description A Next.js middleware that enhances application security by adding
 *              critical security headers to all incoming requests. This middleware
 *              is designed to be production-ready for a financial application.
 * @param {NextRequest} request The incoming request object.
 * @returns {NextResponse} The response object with added security headers.
 */
export function middleware(request: NextRequest): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  // Content Security Policy (CSP)
  const csp = [
    `default-src 'self';`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic';`,
    `style-src 'self' 'nonce-${nonce}';`,
    `img-src 'self' blob: data:;`,
    `font-src 'self';`,
    `object-src 'none';`,
    `base-uri 'self';`,
    `form-action 'self';`,
    `frame-ancestors 'none';`,
    `upgrade-insecure-requests;`,
  ].join(' ');

  const headers = new Headers(request.headers);

  // Set Content-Security-Policy
  headers.set('Content-Security-Policy', csp);

  // Set Strict-Transport-Security
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Set X-Content-Type-Options
  headers.set('X-Content-Type-Options', 'nosniff');

  // Set X-Frame-Options
  headers.set('X-Frame-Options', 'DENY');

  // Set Referrer-Policy
  headers.set('Referrer-Policy', 'origin-when-cross-origin');

  // Set Permissions-Policy
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  const response = NextResponse.next({
    request: {
      headers,
    },
  });

  // Set headers on the response as well
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
