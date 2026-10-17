import { describe, expect, it } from 'vitest';

import { getAuthPhase } from '@/features/auth/auth-phase';

describe('getAuthPhase', () => {
  it('keeps navigation unavailable until the initial session check completes', () => {
    expect(getAuthPhase(false, null)).toBe('checking');
  });

  it('opens guest routes when no user exists', () => {
    expect(getAuthPhase(true, null)).toBe('signed-out');
  });

  it('requires onboarding for an incomplete authenticated user', () => {
    expect(getAuthPhase(true, { onboardingCompleted: false })).toBe('needs-onboarding');
  });

  it('opens the completed application for an onboarded user', () => {
    expect(getAuthPhase(true, { onboardingCompleted: true })).toBe('ready');
  });
});
