import { describe, expect, it } from 'vitest';
import { authPolicy } from '@/constants/auth-policy';
import { sharedAuthOptions } from '@/server/auth/auth-options';

describe('preserved server authentication policy', () => {
  it('applies the shared password limits', () => {
    expect(sharedAuthOptions.emailAndPassword.minPasswordLength).toBe(authPolicy.minimumPasswordLength);
    expect(sharedAuthOptions.emailAndPassword.maxPasswordLength).toBe(authPolicy.maximumPasswordLength);
  });
  it('preserves verified account linking and sensitive-action freshness', () => {
    expect(sharedAuthOptions.user.deleteUser.enabled).toBe(true);
    expect(sharedAuthOptions.session.freshAge).toBe(authPolicy.sensitiveActionFreshnessSeconds);
    expect(sharedAuthOptions.account.accountLinking.enabled).toBe(true);
    expect(sharedAuthOptions.account.accountLinking).not.toHaveProperty('trustedProviders');
  });
});
