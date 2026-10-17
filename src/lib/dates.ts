import { format, isValid, parse, toDate } from 'date-fns-jalali';

const JALALI_FORMAT = 'yyyy/MM/dd';

export function parseJalaliDate(value: string | undefined | null): Date | null {
  if (!value?.trim()) return null;
  const normalized = value.trim().replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
  const parsed = parse(normalized.replaceAll('-', '/'), JALALI_FORMAT, new Date());
  if (!isValid(parsed)) return null;
  const gregorian = toDate(parsed);
  return Number.isNaN(gregorian.valueOf()) ? null : new Date(Date.UTC(gregorian.getFullYear(), gregorian.getMonth(), gregorian.getDate()));
}

export function formatJalaliDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.valueOf()) ? '' : format(date, JALALI_FORMAT);
}

export function businessDate(now = new Date()): Date {
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function effectiveEmploymentStatus(terminationDate: Date | null | undefined, status: string): string {
  return terminationDate && terminationDate <= businessDate() ? 'TERMINATED' : status;
}
