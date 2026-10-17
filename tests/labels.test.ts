import { describe, expect, it } from 'vitest';
import { employmentTypeLabel } from '../src/lib/labels';

describe('employment type labels', () => {
  it('localizes stored enum values without changing the enum', () => {
    expect(employmentTypeLabel('PERMANENT')).toBe('رسمی');
    expect(employmentTypeLabel('CONTRACTOR')).toBe('پیمانکاری');
    expect(employmentTypeLabel('PART_TIME')).toBe('پاره‌وقت');
    expect(employmentTypeLabel('TEMPORARY')).toBe('موقت');
  });
});
