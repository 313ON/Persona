import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { hasExpectedFileSignature, requestOriginAllowed, resolvePrivateStoragePath, secureHeaders } from '@/lib/security';
const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const max = 10 * 1024 * 1024;
const privileged = new Set(['SUPER_ADMIN', 'HR_MANAGER', 'AUDITOR']);
function response(body: unknown, status: number) { return NextResponse.json(body, { status, headers: secureHeaders }); }
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return response({ error: 'نیاز به ورود دارد' }, 401);
  if (!['SUPER_ADMIN', 'HR_MANAGER'].includes(user.role)) return response({ error: 'دسترسی کافی نیست' }, 403);
  if (!requestOriginAllowed(req)) return response({ error: 'درخواست نامعتبر است' }, 403);
  let form: FormData; try { form = await req.formData(); } catch { return response({ error: 'فرم نامعتبر است' }, 400); }
  const file = form.get('file');
  const employeeId = String(form.get('employeeId') || '');
  const replaceId = String(form.get('replaceId') || '');
  const documentType = String(form.get('type') || 'GENERAL').trim().slice(0, 60);
  if (!(file instanceof File) || !employeeId || !/^[A-Za-z0-9_-]{1,60}$/.test(documentType) || !allowed.has(file.type) || file.size <= 0 || file.size > max) return response({ error: 'فایل نامعتبر است' }, 400);
  const employee = await db.employee.findFirst({ where: { id: employeeId, deletedAt: null }, select: { id: true } });
  if (!employee) return response({ error: 'کارمند یافت نشد' }, 404);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasExpectedFileSignature(file.type, bytes)) return response({ error: 'محتوای فایل با نوع اعلام‌شده سازگار نیست' }, 400);
  const storage = path.resolve(process.env.DOCUMENT_STORAGE_PATH || path.join(process.cwd(), 'storage', 'documents'));
  const storageName = randomUUID();
  const filePath = resolvePrivateStoragePath(storage, storageName);
  if (!filePath) return response({ error: 'مسیر ذخیره‌سازی نامعتبر است' }, 500);
  try {
    await fs.mkdir(storage, { recursive: true });
    await fs.writeFile(filePath, bytes, { flag: 'wx' });
    const safeName = file.name.replace(/[^\w. -]/g, '_').slice(0, 255);
    const doc = await db.$transaction(async tx => {
      if (!replaceId) return tx.document.create({ data: { employeeId, type: documentType, originalName: safeName, storageName, mimeType: file.type, sizeBytes: file.size, uploadedById: user.id } });
      const previous = await tx.document.findFirst({ where: { id: replaceId, employeeId, deletedAt: null } });
      if (!previous) throw new Error('REPLACE_TARGET_NOT_FOUND');
      const version = await tx.documentVersion.count({ where: { documentId: replaceId } }) + 1;
      await tx.documentVersion.create({ data: { documentId: replaceId, version, originalName: previous.originalName, storageName: previous.storageName, mimeType: previous.mimeType, sizeBytes: previous.sizeBytes, uploadedById: previous.uploadedById } });
      return tx.document.update({ where: { id: replaceId }, data: { originalName: safeName, storageName, mimeType: file.type, sizeBytes: file.size, uploadedById: user.id, type: documentType } });
    });
    await db.auditEvent.create({ data: { action: replaceId ? 'DOCUMENT_REPLACE' : 'DOCUMENT_UPLOAD', actorUserId: user.id, employeeId, success: true, metadata: { documentId: doc.id } } });
    return NextResponse.json({ id: doc.id }, { status: 201, headers: secureHeaders });
  } catch {
    await fs.unlink(filePath).catch(() => undefined);
    return response({ error: 'ذخیره سند انجام نشد' }, 500);
  }
}
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return response({ error: 'نیاز به ورود دارد' }, 401);
  const id = req.nextUrl.searchParams.get('id') || '';
  if (!id) { const employeeId = req.nextUrl.searchParams.get('employeeId') || ''; const employee = await db.employee.findFirst({ where: { id: employeeId, deletedAt: null }, select: { id: true } }); const permitted = !!employee && (privileged.has(user.role) || user.employeeId === employeeId); if (!permitted) { await db.auditEvent.create({ data: { action: 'AUTHORIZATION_FAILURE', actorUserId: user.id, success: false, metadata: { operation: 'document_list', employeeId } } }).catch(() => undefined); return response({ error: 'دسترسی کافی نیست' }, 403); } const documents = await db.document.findMany({ where: { employeeId, deletedAt: null }, orderBy: { createdAt: 'desc' }, select: { id: true, type: true, originalName: true, mimeType: true, sizeBytes: true, issueDate: true, expiryDate: true, status: true, createdAt: true, uploadedById: true, versions: { orderBy: { version: 'desc' }, select: { version: true, createdAt: true, uploadedById: true } } } }); return NextResponse.json({ data: documents }, { headers: secureHeaders }); }
  const doc = await db.document.findUnique({ where: { id }, include: { employee: { select: { id: true } } } });
  if (doc?.deletedAt) return response({ error: 'سند در سطل بازیافت است' }, 404);
  const permitted = !!doc && (privileged.has(user.role) || user.employeeId === doc.employeeId);
  if (!permitted) {
    await db.auditEvent.create({ data: { action: 'AUTHORIZATION_FAILURE', actorUserId: user.id, success: false, metadata: { operation: 'document_download' } } }).catch(() => undefined);
    return response({ error: 'دسترسی کافی نیست' }, 403);
  }
  const storage = path.resolve(process.env.DOCUMENT_STORAGE_PATH || path.join(process.cwd(), 'storage', 'documents'));
  const filePath = resolvePrivateStoragePath(storage, doc.storageName);
  if (!filePath) return response({ error: 'سند یافت نشد' }, 404);
  try {
    const contents = await fs.readFile(filePath);
    await db.auditEvent.create({ data: { action: 'DOCUMENT_DOWNLOAD', actorUserId: user.id, employeeId: doc.employeeId, success: true, metadata: { documentId: doc.id } } });
    const disposition = req.nextUrl.searchParams.get('inline') === '1' ? 'inline' : 'attachment';
    return new NextResponse(new Uint8Array(contents), { headers: { ...secureHeaders, 'Content-Type': doc.mimeType, 'Content-Length': String(contents.length), 'Content-Disposition': disposition + '; filename="' + encodeURIComponent(doc.originalName) + '"' } });
  } catch { return response({ error: 'سند یافت نشد' }, 404); }
}

export async function DELETE(req: NextRequest) {
  const user = await currentUser(); if (!user) return response({ error: 'نیاز به ورود دارد' }, 401); if (!['SUPER_ADMIN', 'HR_MANAGER'].includes(user.role)) return response({ error: 'دسترسی کافی نیست' }, 403); if (!requestOriginAllowed(req)) return response({ error: 'درخواست نامعتبر است' }, 403);
  const id = req.nextUrl.searchParams.get('id') || ''; if (!id) return response({ error: 'شناسه الزامی است' }, 400);
  try { const doc = await db.document.update({ where: { id }, data: { deletedAt: new Date(), deletedById: user.id } }); await db.auditEvent.create({ data: { action: 'DOCUMENT_DELETE', actorUserId: user.id, employeeId: doc.employeeId, success: true, metadata: { documentId: id } } }); return response({ ok: true }, 200); } catch { return response({ error: 'سند یافت نشد' }, 404); }
}

export async function PATCH(req: NextRequest) {
  const user = await currentUser(); if (!user) return response({ error: 'نیاز به ورود دارد' }, 401); if (!['SUPER_ADMIN', 'HR_MANAGER'].includes(user.role)) return response({ error: 'دسترسی کافی نیست' }, 403); if (!requestOriginAllowed(req)) return response({ error: 'درخواست نامعتبر است' }, 403);
  const id = req.nextUrl.searchParams.get('id') || ''; let body: { restore?: boolean } = {}; try { body = await req.json(); } catch { return response({ error: 'ورودی نامعتبر است' }, 400); }
  if (!body.restore) return response({ error: 'عملیات نامعتبر است' }, 400);
  try { const doc = await db.document.update({ where: { id }, data: { deletedAt: null, deletedById: null } }); await db.auditEvent.create({ data: { action: 'DOCUMENT_RESTORE', actorUserId: user.id, employeeId: doc.employeeId, success: true, metadata: { documentId: id } } }); return response({ ok: true }, 200); } catch { return response({ error: 'سند یافت نشد' }, 404); }
}
