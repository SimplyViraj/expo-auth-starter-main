import type { BetterAuthOptions } from 'better-auth';

import { appConfig } from '@/constants/app-config';
import { authPolicy } from '@/constants/auth-policy';
import { authUserAdditionalFields } from '@/constants/auth-user-fields';

const DAY_IN_SECONDS = 60 * 60 * 24;

export const sharedAuthOptions = {
  appName: appConfig.name,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: authPolicy.minimumPasswordLength,
    maxPasswordLength: authPolicy.maximumPasswordLength,
  },
  user: {
    additionalFields: authUserAdditionalFields,
    deleteUser: {
      enabled: true,
    },
  },
  account: {
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: true,
    },
  },
  session: {
    expiresIn: DAY_IN_SECONDS * 30,
    freshAge: authPolicy.sensitiveActionFreshnessSeconds,
    updateAge: DAY_IN_SECONDS,
    deferSessionRefresh: true,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    storage: 'database',
  },
} as const satisfies BetterAuthOptions;
