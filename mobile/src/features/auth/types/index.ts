import type { AuthSession } from '@/features/auth/services/auth-client';

export type User = AuthSession['user'];

export type AuthPhase = 'checking' | 'signed-out' | 'needs-onboarding' | 'ready';
