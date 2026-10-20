import type { AuthPhase, User } from '@/features/auth/types';

type AuthPhaseUser = Pick<User, 'onboardingCompleted'> & Partial<Pick<User, 'phoneNumber' | 'phoneNumberVerified'>>;

export function getAuthPhase(initialCheckComplete: boolean, user: AuthPhaseUser | null): AuthPhase {
  if (!initialCheckComplete) return 'checking';
  if (!user) return 'signed-out';
  return user.onboardingCompleted && user.phoneNumber && user.phoneNumberVerified ? 'ready' : 'needs-onboarding';
}
