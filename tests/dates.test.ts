import { describe, expect, it } from 'vitest';
import { businessDate, effectiveEmploymentStatus, formatJalaliDate, parseJalaliDate } from '../src/lib/dates';

describe('shared Jalali date boundary', () => {
  it('round-trips a leap-day and month boundary', () => {
    const parsed = parseJalaliDate('۱۴۰۳/۱۲/۳۰');
    expect(parsed).not.toBeNull();
    expect(formatJalaliDate(parsed)).toBe('1403/12/30');
  });
  it('rejects invalid Jalali dates', () => { expect(parseJalaliDate('۱۴۰۲/۱۲/۳۰')).toBeNull(); });
  it('does not terminate on a future date', () => {
    const today = businessDate(new Date('2026-10-17T12:00:00Z'));
    expect(effectiveEmploymentStatus(new Date('2026-10-18T00:00:00Z'), 'ACTIVE')).toBe('ACTIVE');
    expect(effectiveEmploymentStatus(today, 'ACTIVE')).toBe('TERMINATED');
  });
});
