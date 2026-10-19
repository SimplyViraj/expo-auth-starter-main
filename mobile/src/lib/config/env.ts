export type AppEnvironment = 'development' | 'staging' | 'production';

const configuredAppEnvironment = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';

if (!['development', 'staging', 'production'].includes(configuredAppEnvironment)) {
  throw new Error('EXPO_PUBLIC_APP_ENV must be development, staging, or production');
}

export const env = {
  appEnvironment: configuredAppEnvironment as AppEnvironment,
  apiBaseUrl: process.env.EXPO_PUBLIC_API_URL ?? null,
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? null,
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? null,
  googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? null,
} as const;

export const isGoogleAuthConfigured = Boolean(
  env.googleWebClientId,
);
