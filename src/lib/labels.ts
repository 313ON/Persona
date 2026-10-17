export const employmentTypeLabels: Record<string, string> = {
  PERMANENT: 'رسمی',
  CONTRACTOR: 'پیمانکاری',
  PART_TIME: 'پاره‌وقت',
  TEMPORARY: 'موقت',
};

export function employmentTypeLabel(value: string | null | undefined): string {
  return value ? employmentTypeLabels[value] || value : '—';
}
