import { describe, expect, it } from '@jest/globals';
import { validateEnvironment } from './env.validation.js';

const valid = {
  DATABASE_URL: 'postgresql://user:pass@localhost/app_test',
  BETTER_AUTH_SECRET: 'test-only-secret-with-more-than-32-characters',
  BETTER_AUTH_URL: 'http://localhost:3000',
  EMAIL_FROM: 'App <test@example.com>',
  RESEND_API_KEY: 're_test_key',
};
describe('backend environment', () => {
  it('applies defaults and parses exact browser origins', () => {
    expect(validateEnvironment({ ...valid, AUTH_TRUSTED_ORIGINS: 'http://localhost:8081, https://app.example.com' })).toMatchObject({ PORT: 3000, AUTH_TRUSTED_ORIGINS: ['http://localhost:8081', 'https://app.example.com'] });
  });
  it('normalizes trailing slashes so accepted origins match browser headers', () => {
    expect(validateEnvironment({ ...valid, BETTER_AUTH_URL: 'http://localhost:3000/', AUTH_TRUSTED_ORIGINS: 'http://localhost:8081/' })).toMatchObject({
      BETTER_AUTH_URL: 'http://localhost:3000', AUTH_TRUSTED_ORIGINS: ['http://localhost:8081'],
    });
  });
  it.each([
    { DATABASE_URL: 'file:app.db' }, { PORT: '0' }, { BETTER_AUTH_SECRET: 'short' },
    { BETTER_AUTH_URL: 'ftp://localhost' }, { AUTH_TRUSTED_ORIGINS: 'https://*.example.com' }, { AUTH_TRUSTED_ORIGINS: 'https://*.example.com/path' },
    { EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'test.apps.googleusercontent.com' },
    { NODE_ENV: 'production' }, { TWILIO_ACCOUNT_SID: 'AC' + 'a'.repeat(32) }, { TWILIO_ACCOUNT_SID: 'invalid' },
  ])('rejects invalid configuration %j', (override) => {
    expect(() => validateEnvironment({ ...valid, ...override })).toThrow('Invalid backend environment');
  });
  it('accepts a complete Twilio Verify configuration', () => {
    expect(validateEnvironment({ ...valid, TWILIO_ACCOUNT_SID: 'AC' + 'a'.repeat(32), TWILIO_AUTH_TOKEN: 'b'.repeat(32), TWILIO_VERIFY_SERVICE_SID: 'VA' + 'c'.repeat(32) }).TWILIO_VERIFY_SERVICE_SID).toBe('VA' + 'c'.repeat(32));
  });
  it('does not print database credentials in errors', () => {
    expect(() => validateEnvironment({ ...valid, DATABASE_URL: 'private-password' })).toThrow('DATABASE_URL');
    try { validateEnvironment({ ...valid, DATABASE_URL: 'private-password' }); } catch (error) { expect(String(error)).not.toContain('private-password'); }
  });
});
