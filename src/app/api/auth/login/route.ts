import { NextRequest, NextResponse } from 'next/server';
import argon2 from 'argon2';
import { z } from 'zod';
import { db } from '@/lib/db';
import { createSession, SESSION_MAX_AGE_SECONDS } from '@/lib/auth';
import { clientIp, requestOriginAllowed } from "@/lib/security";
import { secureHeaders } from '@/lib/security';
const schema = z.object({ email: z.string().email(), password: z.string().min(12).max(200) });
export async function POST(req: NextRequest) {
  if (!requestOriginAllowed(req)) return NextResponse.json({ error: "Invalid request" }, { status: 403, headers: secureHeaders });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'اطلاعات ورود نامعتبر است' }, { status: 400, headers: secureHeaders }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'اطلاعات ورود نامعتبر است' }, { status: 400, headers: secureHeaders });
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const ok = !!user && user.isActive && await argon2.verify(user.passwordHash, parsed.data.password);
  await db.auditEvent.create({ data: { action: ok ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE', actorUserId: ok ? user.id : undefined, success: ok, ipAddress: clientIp(req) } });
  if (!ok) return NextResponse.json({ error: 'ورود ناموفق است' }, { status: 401, headers: secureHeaders });
  const token = await createSession(user.id);
  const response = NextResponse.json({ ok: true }, { headers: secureHeaders });
  response.cookies.set('session', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: SESSION_MAX_AGE_SECONDS, path: '/' });
  return response;
}
