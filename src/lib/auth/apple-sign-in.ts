import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import { authClient } from '@/lib/auth/auth-client';

export type AppleSignInOutcome = 'success' | 'cancelled';

function createNonce() {
  return Array.from(Crypto.getRandomBytes(32), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function optionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function isAppleCancellation(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ERR_REQUEST_CANCELED'
  );
}

export async function signInWithApple(): Promise<AppleSignInOutcome> {
  if (Platform.OS !== 'ios' || !(await AppleAuthentication.isAvailableAsync())) {
    throw new Error('Sign in with Apple is unavailable on this device.');
  }

  const nonce = createNonce();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);

  try {
    const credential = await AppleAuthentication.signInAsync({
      nonce: hashedNonce,
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('Apple could not verify your identity. Please try again.');
    }

    const firstName = optionalText(credential.fullName?.givenName);
    const lastName = optionalText(credential.fullName?.familyName);
    const email = optionalText(credential.email);
    const hasOneTimeProfile = Boolean(firstName || lastName || email);

    const result = await authClient.signIn.social({
      provider: 'apple',
      idToken: {
        token: credential.identityToken,
        nonce,
        user: hasOneTimeProfile
          ? {
              name: { firstName, lastName },
              email,
            }
          : undefined,
      },
    });

    if (result.error) {
      if (result.error.code === 'OAUTH_LINK_ERROR') {
        throw new Error(
          'This email already has an account. Sign in with email and verify it, then try Apple again.',
        );
      }

      throw new Error('Apple Sign-In could not be completed.');
    }

    return 'success';
  } catch (error) {
    if (isAppleCancellation(error)) return 'cancelled';

    throw error instanceof Error
      ? error
      : new Error('Apple Sign-In could not be completed.');
  }
}
