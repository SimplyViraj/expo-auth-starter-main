const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('Set TEST_DATABASE_URL to a dedicated PostgreSQL database ending in _test');
let parsed;
try { parsed = new URL(url); } catch { throw new Error('TEST_DATABASE_URL must be a PostgreSQL URL'); }
if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !decodeURIComponent(parsed.pathname).endsWith('_test')) {
  throw new Error('Refusing integration tests: database name must end in _test');
}
process.env.DATABASE_URL = url;
process.env.NODE_ENV = 'test';
process.env.BETTER_AUTH_SECRET = 'local-integration-test-secret-at-least-32-characters';
process.env.BETTER_AUTH_URL = 'http://localhost:3000';
process.env.AUTH_TRUSTED_ORIGINS = 'http://localhost:8081';
process.env.EMAIL_FROM = 'Integration <test@example.com>';
process.env.RESEND_API_KEY = 're_test_transport_is_replaced';
delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
delete process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
delete process.env.GOOGLE_CLIENT_SECRET;
