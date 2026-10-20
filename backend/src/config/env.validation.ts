import { z } from 'zod';

const origin = z.url().refine((value) => {
  const url = new URL(value);
  return ['http:', 'https:'].includes(url.protocol) && url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password && !url.hostname.includes('*');
}, 'Must be an exact HTTP(S) origin').transform((value) => new URL(value).origin);
const googleId = z.string().endsWith('.apps.googleusercontent.com').optional();
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().min(1).default('0.0.0.0'),
  DATABASE_URL: z.url().refine((value) => /^postgres(ql)?:\/\//.test(value), 'Must use PostgreSQL'),
  BETTER_AUTH_URL: origin,
  BETTER_AUTH_SECRET: z.string().min(32),
  AUTH_TRUSTED_ORIGINS: z.string().default('').transform((value) => value.split(',').map((s) => s.trim()).filter(Boolean)).pipe(z.array(origin).max(10)),
  EMAIL_FROM: z.string().refine((value) => z.email().safeParse(value.match(/<([^>]+)>\s*$/)?.[1] ?? value).success, 'Must contain an email address'),
  RESEND_API_KEY: z.string().startsWith('re_').min(8),
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: googleId,
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: googleId,
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: googleId,
  TWILIO_ACCOUNT_SID: z.string().regex(/^AC[0-9a-f]{32}$/i).optional(),
  TWILIO_AUTH_TOKEN: z.string().min(32).optional(),
  TWILIO_VERIFY_SERVICE_SID: z.string().regex(/^VA[0-9a-f]{32}$/i).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
}).superRefine((value, ctx) => {
  const twilio = [value.TWILIO_ACCOUNT_SID, value.TWILIO_AUTH_TOKEN, value.TWILIO_VERIFY_SERVICE_SID];
  if (twilio.some(Boolean) && !twilio.every(Boolean)) ctx.addIssue({ code: 'custom', path: ['TWILIO_ACCOUNT_SID'], message: 'Twilio requires account SID, auth token and Verify service SID together' });
  if (value.NODE_ENV === 'production' && !twilio.every(Boolean)) ctx.addIssue({ code: 'custom', path: ['TWILIO_ACCOUNT_SID'], message: 'Twilio Verify is required for phone onboarding in production' });
  const google = [value.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, value.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, value.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID, value.GOOGLE_CLIENT_SECRET];
  if (google.some(Boolean) && (!google[0] || !google[3])) ctx.addIssue({ code: 'custom', path: ['GOOGLE_CLIENT_SECRET'], message: 'Google requires both web client ID and secret' });
  if (value.NODE_ENV === 'production') {
    for (const url of [value.BETTER_AUTH_URL, ...value.AUTH_TRUSTED_ORIGINS]) {
      if (!url.startsWith('https://')) ctx.addIssue({ code: 'custom', path: ['BETTER_AUTH_URL'], message: 'Production origins require HTTPS' });
    }
    if (/replace|generate-a-random|change-me/i.test(value.BETTER_AUTH_SECRET)) ctx.addIssue({ code: 'custom', path: ['BETTER_AUTH_SECRET'], message: 'Generate a production secret' });
  }
});
export type Environment = z.infer<typeof schema>;
export function validateEnvironment(input: Record<string, unknown>): Environment {
  const result = schema.safeParse(input);
  if (!result.success) throw new Error('Invalid backend environment: ' + result.error.issues.map((issue) => issue.path.join('.') + ': ' + issue.message).join('; '));
  return result.data;
}
