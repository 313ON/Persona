import { db } from './db';
import type { AuditAction, Prisma } from '@prisma/client';

export async function recordAudit(input: {
  action: AuditAction;
  actorUserId?: string;
  employeeId?: string;
  metadata?: Prisma.InputJsonValue;
  success?: boolean;
}) {
  const event = await db.auditEvent.create({ data: { ...input, success: input.success ?? true } });
  const recipients = await db.user.findMany({ where: { isActive: true, role: { in: ['SUPER_ADMIN', 'HR_MANAGER', 'AUDITOR'] } }, select: { id: true } });
  if (recipients.length) await db.notification.createMany({ data: recipients.map(({ id }) => ({ eventId: event.id, recipientId: id })), skipDuplicates: true });
  return event;
}
