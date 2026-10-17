import { Platform } from 'react-native';

import { env } from '@/config/env';
import { authClient } from '@/lib/auth/auth-client';

export type GoogleSignInOutcome = 'success' | 'cancelled';

export async function signInWithGoogle(): Promise<GoogleSignInOutcome> {
  if (Platform.OS === 'web') {
    throw new Error('Google Sign-In is available in the iOS and Android apps.');
  }

  if (!env.googleWebClientId) {
    throw new Error('Google Sign-In is not configured yet.');
  }

  const result = await authClient.signIn.social({
    provider: 'google',
    callbackURL: '/',
  });

  if (result.error) {
    if (result.error.code === 'USER_CANCELLED') return 'cancelled';

    if (result.error.code === 'OAUTH_LINK_ERROR') {
      throw new Error(
        'This email already has an account. Sign in with email and verify it, then try Google again.',
      );
    }

    throw new Error('Google Sign-In could not be completed.');
  }

  return 'success';
}
