import { createHash, randomBytes } from 'node:crypto';
import path from 'node:path';
import type { NextRequest } from 'next/server';

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export const newSessionToken = () => randomBytes(32).toString('hex');
export const newCspNonce = () => randomBytes(16).toString('base64');
export const contentSecurityPolicyForNonce = (nonce: string) => [
  "default-src 'self'",
  `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');
export const secureHeaders: Record<string, string> = {
  'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export function requestOriginAllowed(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return false;
  try {
    const expected = new URL(request.nextUrl.protocol + '//' + host);
    const actual = new URL(origin);
    return actual.origin === expected.origin;
  } catch { return false; }
}

export function clientIp(request: NextRequest): string | undefined {
  if (process.env.TRUST_PROXY === 'true') return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || undefined;
  return undefined;
}

export function resolvePrivateStoragePath(storageRoot: string, storageName: string): string | null {
  if (!/^[a-f0-9-]{36}$/.test(storageName)) return null;
  const root = path.resolve(storageRoot);
  const candidate = path.resolve(root, storageName);
  return candidate.startsWith(root + path.sep) ? candidate : null;
}

export function hasExpectedFileSignature(mimeType: string, bytes: Uint8Array): boolean {
  if (mimeType === 'application/pdf') return bytes.length >= 4 && String.fromCharCode(...bytes.slice(0, 4)) === '%PDF';
  if (mimeType === 'image/png') return bytes.length >= 8 && bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index]);
  if (mimeType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return false;
}
