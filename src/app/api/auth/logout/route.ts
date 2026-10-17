import { NextRequest, NextResponse } from 'next/server';
import { revokeCurrentSession } from '@/lib/auth';
import { requestOriginAllowed, secureHeaders } from '@/lib/security';
export async function POST(req: NextRequest) {
  if (!requestOriginAllowed(req)) return NextResponse.json({ error: 'درخواست نامعتبر است' }, { status: 403, headers: secureHeaders });
  await revokeCurrentSession();
  const response = NextResponse.json({ ok: true }, { headers: secureHeaders });
  response.cookies.set('session', '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 0, expires: new Date(0), path: '/' });
  return response;
}
