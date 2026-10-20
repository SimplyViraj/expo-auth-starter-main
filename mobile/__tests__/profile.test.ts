import { describe, expect, it } from 'vitest';

import { updateProfileSchema } from '@/features/profile/profile-contract';

describe('member profile editing', () => {
  it('trims names and normalizes usernames before saving', () => {
    expect(updateProfileSchema.parse({ name: '  Anaya Sharma  ', username: '  ANAYA_42  ' })).toEqual({ name: 'Anaya Sharma', username: 'anaya_42' });
  });

  it('supports international names', () => {
    expect(updateProfileSchema.safeParse({ name: 'आन्या शर्मा', username: 'anaya' }).success).toBe(true);
  });

  it.each(['', '  ', 'a', 'a'.repeat(81), 'Anaya\nSharma'])('rejects invalid names: %j', (name) => {
    expect(updateProfileSchema.safeParse({ name, username: 'anaya' }).success).toBe(false);
  });

  it.each(['', 'ab', '1name', 'invalid-name', 'a'.repeat(25)])('rejects invalid usernames: %j', (username) => {
    expect(updateProfileSchema.safeParse({ name: 'Anaya Sharma', username }).success).toBe(false);
  });

  it('does not accept identity or verification fields as editable input', () => {
    expect(updateProfileSchema.safeParse({ name: 'Anaya Sharma', username: 'anaya', email: 'other@example.com', phoneNumberVerified: true }).success).toBe(false);
  });
});
