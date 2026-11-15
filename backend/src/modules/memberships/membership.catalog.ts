export const ACCOUNT_TYPES = ['INDIVIDUAL', 'COUPLE', 'GROUP'] as const;
export const TIERS = ['STARTER', 'CORE', 'ELITE'] as const;
export type AccountType = typeof ACCOUNT_TYPES[number];
export type Tier = typeof TIERS[number];

// Calendar validity, not months * 30 days; preserve the activation time in UTC.
export function addCalendarMonths(start: Date, months: number) {
  const end = new Date(start);
  const day = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + months);
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(day, last));
  return end;
}
