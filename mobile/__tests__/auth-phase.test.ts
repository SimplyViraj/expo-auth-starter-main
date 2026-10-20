import { describe, expect, it } from 'vitest';

import { getAuthPhase } from '@/features/auth/utils/auth-phase';

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
    expect(getAuthPhase(true, { onboardingCompleted: true, phoneNumber: '+14155552671', phoneNumberVerified: true })).toBe('ready');
  });
});

it('requires phone onboarding for existing completed accounts without a verified number', () => {
  expect(getAuthPhase(true, { onboardingCompleted: true })).toBe('needs-onboarding');
  expect(getAuthPhase(true, { onboardingCompleted: true, phoneNumber: '+14155552671', phoneNumberVerified: false })).toBe('needs-onboarding');
});
