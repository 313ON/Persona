import { cookies } from 'next/headers';
import argon2 from 'argon2';
import { db } from './db';
import { hashToken, newSessionToken } from './security';
import type { Role, User } from '@prisma/client';

export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export async function currentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session) return null;
  if (session.expiresAt <= new Date() || !session.user.isActive) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return session.user;
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> { return argon2.verify(hash, password); }
export async function createSession(userId: string): Promise<string> {
  const token = newSessionToken();
  await db.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000) } });
  return token;
}
export async function revokeCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}
export async function requireRole(roles: readonly Role[]): Promise<User> {
  const user = await currentUser();
  if (!user || !roles.includes(user.role)) throw new Error('UNAUTHORIZED');
  return user;
}
