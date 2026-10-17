import type { AuthPhase, User } from '@/features/auth/types';

type AuthPhaseUser = Pick<User, 'onboardingCompleted'>;

export function getAuthPhase(initialCheckComplete: boolean, user: AuthPhaseUser | null): AuthPhase {
  if (!initialCheckComplete) return 'checking';
  if (!user) return 'signed-out';
  return user.onboardingCompleted ? 'ready' : 'needs-onboarding';
}
