import { describe, expect, it } from 'vitest';

import { authPolicy } from '@/constants/auth-policy';
import {
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from '@/features/auth/validation/auth-schemas';
import { sharedAuthOptions } from '@/server/auth/auth-options';

const existingShorterPassword = 'short-pass1';
const policyPassword = 'secure-pass-123';

describe('authentication password policy', () => {
  it('accepts existing shorter passwords at sign in', () => {
    expect(
      signInSchema.safeParse({ email: 'person@example.com', password: existingShorterPassword }).success,
    ).toBe(true);
  });

  it('requires the shared minimum for registration', () => {
    const result = signUpSchema.safeParse({
      name: 'Example User',
      email: 'person@example.com',
      password: existingShorterPassword,
      confirmPassword: existingShorterPassword,
    });

    expect(result.success).toBe(false);
    expect(authPolicy.minimumPasswordLength).toBe(15);
  });

  it('requires the shared minimum for password reset', () => {
    const result = resetPasswordSchema.safeParse({
      otp: '123456',
      password: existingShorterPassword,
      confirmPassword: existingShorterPassword,
    });

    expect(result.success).toBe(false);
  });

  it('accepts a policy-length password for registration and reset', () => {
    expect(
      signUpSchema.safeParse({
        name: 'Example User',
        email: 'person@example.com',
        password: policyPassword,
        confirmPassword: policyPassword,
      }).success,
    ).toBe(true);
    expect(
      resetPasswordSchema.safeParse({
        otp: '123456',
        password: policyPassword,
        confirmPassword: policyPassword,
      }).success,
    ).toBe(true);
  });

  it('applies the same password limits on the server', () => {
    expect(sharedAuthOptions.emailAndPassword.minPasswordLength).toBe(
      authPolicy.minimumPasswordLength,
    );
    expect(sharedAuthOptions.emailAndPassword.maxPasswordLength).toBe(
      authPolicy.maximumPasswordLength,
    );
  });

  it('enables verified account linking without forcing trusted providers', () => {
    expect(sharedAuthOptions.user.deleteUser.enabled).toBe(true);
    expect(sharedAuthOptions.session.freshAge).toBe(
      authPolicy.sensitiveActionFreshnessSeconds,
    );
    expect(sharedAuthOptions.account.accountLinking.enabled).toBe(true);
    expect(sharedAuthOptions.account.accountLinking).not.toHaveProperty('trustedProviders');
  });
});
