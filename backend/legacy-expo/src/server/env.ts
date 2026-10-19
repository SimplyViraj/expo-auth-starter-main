import { z } from 'zod';

const senderSchema = z.string().min(3, 'EMAIL_FROM must identify the sender').refine((value) => {
  const address = value.match(/<([^>]+)>\s*$/)?.[1] ?? value;
  return z.email().safeParse(address.trim()).success;
}, 'EMAIL_FROM must contain a valid email address');

const googleClientIdSchema = z
  .string()
  .endsWith('.apps.googleusercontent.com', 'Google client IDs must end with .apps.googleusercontent.com')
  .optional();

const webOriginSchema = z
  .url('AUTH_TRUSTED_ORIGINS must contain valid URLs')
  .refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), {
    message: 'AUTH_TRUSTED_ORIGINS supports only http:// or https:// origins',
  })
  .transform((value) => new URL(value).origin);

const trustedOriginsSchema = z
  .string()
  .optional()
  .transform((value) => value?.split(',').map((origin) => origin.trim()).filter(Boolean) ?? [])
  .pipe(z.array(webOriginSchema).max(10));

const serverEnvSchema = z
  .object({
    DATABASE_URL: z
      .url('DATABASE_URL must be a valid PostgreSQL URL')
      .refine((value) => value.startsWith('postgres://') || value.startsWith('postgresql://'), {
        message: 'DATABASE_URL must use the postgres:// or postgresql:// protocol',
      }),
    BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must contain at least 32 characters'),
    BETTER_AUTH_URL: z.url('BETTER_AUTH_URL must be a valid URL'),
    AUTH_TRUSTED_ORIGINS: trustedOriginsSchema,
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    EMAIL_FROM: senderSchema,
    RESEND_API_KEY: z.string().startsWith('re_', 'RESEND_API_KEY must be a Resend API key'),
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: googleClientIdSchema,
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: googleClientIdSchema,
    EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: googleClientIdSchema,
    GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET cannot be empty').optional(),
  })
  .superRefine((value, context) => {
    const googleValues = [
      value.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      value.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      value.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      value.GOOGLE_CLIENT_SECRET,
    ];
    const configuredValues = googleValues.filter(Boolean).length;

    if (configuredValues > 0 && (!value.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || !value.GOOGLE_CLIENT_SECRET)) {
      context.addIssue({
        code: 'custom',
        path: ['GOOGLE_CLIENT_SECRET'],
        message: 'Google Sign-In requires the Web client ID and Web client secret',
      });
    }

    if (value.NODE_ENV === 'production') {
      const authUrl = new URL(value.BETTER_AUTH_URL);

      if (authUrl.protocol !== 'https:') {
        context.addIssue({
          code: 'custom',
          path: ['BETTER_AUTH_URL'],
          message: 'BETTER_AUTH_URL must use https:// in production',
        });
      }

      value.AUTH_TRUSTED_ORIGINS.forEach((origin, index) => {
        if (new URL(origin).protocol !== 'https:') {
          context.addIssue({
            code: 'custom',
            path: ['AUTH_TRUSTED_ORIGINS', index],
            message: 'Additional trusted origins must use https:// in production',
          });
        }
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedServerEnv: ServerEnv | undefined;

export function parseServerEnv(input: Record<string, string | undefined>) {
  const result = serverEnvSchema.safeParse(input);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
      .join('; ');

    throw new Error(`Invalid server environment: ${details}`);
  }

  return result.data;
}

export function getServerEnv() {
  cachedServerEnv ??= parseServerEnv(process.env);
  return cachedServerEnv;
}
