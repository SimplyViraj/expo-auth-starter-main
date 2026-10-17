import { expoClient } from '@better-auth/expo/client';
import { emailOTPClient, inferAdditionalFields } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

import { appConfig } from '@/constants/app-config';
import { authUserAdditionalFields } from '@/constants/auth-user-fields';
import { getApiBaseUrl } from '@/lib/api/base-url';

export const authClient = createAuthClient({
  baseURL: getApiBaseUrl(),
  plugins: [
    inferAdditionalFields({
      user: authUserAdditionalFields,
    }),
    emailOTPClient(),
    expoClient({
      scheme: appConfig.scheme,
      storagePrefix: appConfig.scheme,
      cookiePrefix: 'better-auth',
      storage: SecureStore,
    }),
  ],
});

export function revalidateAuthSession() {
  authClient.$store.notify('$sessionSignal');
}

export type AuthSession = typeof authClient.$Infer.Session;
