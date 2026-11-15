export const ACCOUNT_TYPES = ['INDIVIDUAL', 'COUPLE', 'GROUP'] as const;
export const TIERS = ['STARTER', 'CORE', 'ELITE'] as const;
export const MONTHS = [1, 3, 6, 12] as const;
export type AccountType = typeof ACCOUNT_TYPES[number];
export type Tier = typeof TIERS[number];
export const PRICES: Record<AccountType, Record<Tier, readonly number[]>> = {
  INDIVIDUAL: { STARTER: [8999, 22999, 43999, 81999], CORE: [11999, 32999, 61999, 114999], ELITE: [14999, 40999, 76999, 143999] },
  COUPLE: { STARTER: [16999, 45999, 85999, 162999], CORE: [21999, 59999, 112999, 211999], ELITE: [27999, 75999, 142999, 268999] },
  GROUP: { STARTER: [31999, 85999, 162999, 306999], CORE: [39999, 107999, 203999, 383999], ELITE: [50999, 136999, 259999, 488999] },
};
export const ALLOWANCES = { STARTER: 4, CORE: 8, ELITE: 12 } as const;
export const CREDIT_SESSION_RATES: Record<string, number> = {
  'sleep-reset': 2, 'revive-thrive': 2, 'glow-revival': 2, 'recovery-reset': 2,
  'metabolic-reset': 2, 'longevity-plus': 2, 'executive-performance': 1,
  'biohacker-protocol': 2, 'muscle-for-age': 3, 'pain-mobility': 3,
};
const program = (id: string, name: string, sessionA: string, sessionB: string, note = '') => ({ id, name, sessionMinutes: 60, sessionA, sessionB, note });
export const PROGRAMS = [
  program('sleep-reset', 'Sleep Reset', 'Sauna 20 min; Cold Plunge 5 min; Massage Chair + Hydrogen 35 min, with Guided Meditation + Sound Therapy.', 'Red Light Therapy 30 min; Compression Therapy 30 min.'),
  program('revive-thrive', 'Revive & Thrive', 'Sauna 20 min; Cold Plunge 5 min; Hydrogen Inhalation 35 min, with Breathwork.', 'Compression Therapy 30 min; Red Light Therapy 30 min.'),
  program('glow-revival', 'Glow Revival', 'Sauna 20 min; Cold Plunge 5 min; Red Light Therapy 35 min.', 'Massage Chair + Hydrogen 30 min, with Breathwork; Compression Therapy 30 min.'),
  program('recovery-reset', 'Recovery & Reset', 'Sauna 20 min; Cold Plunge 5 min; Compression Therapy 35 min, with recovery discussion/stretch.', 'PEMF Therapy 30 min; Massage Chair + Hydrogen 30 min, with Meditation.'),
  program('metabolic-reset', 'Metabolic Reset', 'Sauna 20 min; Cold Plunge 5 min; Red Light Therapy 35 min.', 'EMS 30 min; Massage Chair + Hydrogen 30 min, with Nutrition coaching.'),
  program('longevity-plus', 'Longevity Plus', 'Sauna 20 min; Cold Plunge 5 min; Red Light Therapy 35 min.', 'PEMF Therapy 30 min; Massage Chair + Hydrogen 30 min, with Guided Breathwork + Meditation.'),
  program('executive-performance', 'Executive Performance', 'Sauna 20 min; Cold Plunge 5 min; Red Light Therapy 15 min; Compression Therapy 20 min.', 'HBOT 60 min, with Meditation/Focus Audio.'),
  program('biohacker-protocol', 'Biohacker Protocol', 'Sauna 20 min; Cold Plunge 5 min; Red Light Therapy 35 min.', 'PEMF Therapy 30 min; Hydrogen Inhalation 30 min, with Breathwork via headphones.', 'Alternate PEMF with Compression on later Session B visits; each visit stays within 60 minutes.'),
  program('muscle-for-age', 'Muscle for Age', 'EMS 30 min; Red Light Therapy 30 min.', 'Physiotherapy 25 min; Yoga/Fall Prevention 20 min; Massage Chair 15 min, with Breathwork.'),
  program('pain-mobility', 'Pain & Mobility', 'PEMF Therapy 30 min; Red Light Therapy 20 min; Massage Chair 10 min.', 'Physiotherapy/Guided Stretching 30 min; Yoga Therapy 20 min; Guided Breathwork & Relaxation 10 min.'),
];

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
