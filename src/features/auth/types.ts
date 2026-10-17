import type { AuthSession } from '@/lib/auth/auth-client';

export type User = AuthSession['user'];

export type AuthPhase = 'checking' | 'signed-out' | 'needs-onboarding' | 'ready';
