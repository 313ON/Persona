import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { requestOriginAllowed, secureHeaders } from '@/lib/security';
import { parseJalaliDate } from '@/lib/dates';

const roles = ['SUPER_ADMIN', 'HR_MANAGER'] as const;
const schema = z.object({ employeeId: z.string().min(1), status: z.enum(['PENDING', 'COMPLETED']), settlementDate: z.string().optional().or(z.literal('')), notes: z.string().max(2000).optional(), amount: z.coerce.number().finite().nonnegative().max(9999999999999999).optional() });

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'نیاز به ورود دارد' }, { status: 401, headers: secureHeaders });
  const employeeId = req.nextUrl.searchParams.get('employeeId') || undefined;
  if (!employeeId && !roles.includes(user.role as never)) return NextResponse.json({ error: 'دسترسی کافی نیست' }, { status: 403, headers: secureHeaders });
  if (employeeId && !roles.includes(user.role as never) && user.employeeId !== employeeId) return NextResponse.json({ error: 'دسترسی کافی نیست' }, { status: 403, headers: secureHeaders });
  const data = await db.settlement.findMany({ where: employeeId ? { employeeId } : undefined, select: { id: true, employeeId: true, status: true, settlementDate: true, amount: true, notes: true, createdAt: true, updatedAt: true, employee: { select: { id: true, employeeNumber: true, firstName: true, lastName: true, employmentStatus: true } } }, orderBy: { updatedAt: 'desc' } });
  return NextResponse.json({ data }, { headers: secureHeaders });
}

export async function PUT(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'نیاز به ورود دارد' }, { status: 401, headers: secureHeaders });
  if (!roles.includes(user.role as never) || !requestOriginAllowed(req)) return NextResponse.json({ error: 'دسترسی کافی نیست' }, { status: 403, headers: secureHeaders });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'اطلاعات تسویه معتبر نیست' }, { status: 400, headers: secureHeaders });
  const value = parsed.data;
  const employee = await db.employee.findFirst({ where: { id: value.employeeId, employmentStatus: 'TERMINATED', deletedAt: null } });
  if (!employee) return NextResponse.json({ error: 'تسویه فقط برای پرسنل خاتمه‌یافته مجاز است' }, { status: 400, headers: secureHeaders });
  const settlementDate = value.settlementDate ? parseJalaliDate(value.settlementDate) || new Date(value.settlementDate) : null;
  if (value.settlementDate && (settlementDate === null || Number.isNaN(settlementDate.valueOf()))) return NextResponse.json({ error: 'تاریخ تسویه معتبر نیست' }, { status: 400, headers: secureHeaders });
  const settlement = await db.settlement.upsert({ where: { employeeId: value.employeeId }, create: { employeeId: value.employeeId, status: value.status, settlementDate, notes: value.notes?.trim() || undefined, amount: value.amount ?? null }, update: { status: value.status, settlementDate, notes: value.notes?.trim() || null, amount: value.amount ?? null } });
  await db.auditEvent.create({ data: { action: 'SETTLEMENT_CHANGE', actorUserId: user.id, employeeId: value.employeeId, success: true, metadata: { status: value.status, hasAmount: value.amount !== undefined } } });
  return NextResponse.json({ data: { id: settlement.id, employeeId: settlement.employeeId, status: settlement.status, settlementDate: settlement.settlementDate, amount: settlement.amount, notes: settlement.notes, createdAt: settlement.createdAt, updatedAt: settlement.updatedAt } }, { headers: secureHeaders });
}
