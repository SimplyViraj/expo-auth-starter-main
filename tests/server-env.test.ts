import { describe, expect, it } from 'vitest';

import { parseServerEnv } from '@/server/env';

const validEnvironment = {
  DATABASE_URL: 'postgresql://user:password@database.example.com/app',
  BETTER_AUTH_SECRET: 'a-secure-secret-with-more-than-32-characters',
  BETTER_AUTH_URL: 'https://api.example.com',
  EMAIL_FROM: 'Example App <auth@example.com>',
  RESEND_API_KEY: 're_test_key',
  NODE_ENV: 'production',
};

describe('server environment', () => {
  it('accepts the required production configuration', () => {
    const environment = parseServerEnv(validEnvironment);

    expect(environment.BETTER_AUTH_URL).toBe('https://api.example.com');
    expect(environment.AUTH_TRUSTED_ORIGINS).toEqual([]);
  });

  it('rejects an insecure production auth origin', () => {
    expect(() => parseServerEnv({ ...validEnvironment, BETTER_AUTH_URL: 'http://api.example.com' })).toThrow(
      'BETTER_AUTH_URL must use https:// in production',
    );
  });

  it('requires Google configuration as one complete group', () => {
    expect(() =>
      parseServerEnv({
        ...validEnvironment,
        EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'web.apps.googleusercontent.com',
      }),
    ).toThrow('Google Sign-In requires');
  });

  it('never includes submitted secret values in validation errors', () => {
    const submittedSecret = 'too-short';

    expect(() => parseServerEnv({ ...validEnvironment, BETTER_AUTH_SECRET: submittedSecret })).toThrow(
      'BETTER_AUTH_SECRET must contain at least 32 characters',
    );

    try {
      parseServerEnv({ ...validEnvironment, BETTER_AUTH_SECRET: submittedSecret });
    } catch (error) {
      expect(String(error)).not.toContain(submittedSecret);
    }
  });
});
