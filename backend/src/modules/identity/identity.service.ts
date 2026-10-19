import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { appIdentity } from '../../config/configuration.js';
import type { Environment } from '../../config/env.validation.js';

@Injectable()
export class IdentityService {
  constructor(private readonly config: ConfigService<Environment, true>) {}
  providers() {
    const web = this.config.get('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID', { infer: true });
    const secret = this.config.get('GOOGLE_CLIENT_SECRET', { infer: true });
    return {
      apple: {
        clientId: appIdentity.iosBundleIdentifier,
        appBundleIdentifier: appIdentity.iosBundleIdentifier,
        mapProfileToUser: (profile: { email?: string; sub: string }) => ({
          email: profile.email ?? profile.sub + '@apple.placeholder.local',
        }),
      },
      ...(web && secret ? {
        google: {
          clientId: [web, this.config.get('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID', { infer: true }), this.config.get('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID', { infer: true })].filter((value): value is string => Boolean(value)),
          clientSecret: secret,
        },
      } : {}),
    };
  }
  trustedOrigins() {
    return [
      appIdentity.scheme + '://',
      appIdentity.scheme + '://*',
      'https://appleid.apple.com',
      this.config.get('BETTER_AUTH_URL', { infer: true }),
      ...this.config.get('AUTH_TRUSTED_ORIGINS', { infer: true }),
      ...(this.config.get('NODE_ENV', { infer: true }) === 'development' ? ['exp://', 'exp://**'] : []),
    ];
  }
  allowsApplicationOrigin(value: string) {
    // Application APIs accept browser origins or the installed native scheme.
    return value.startsWith(appIdentity.scheme + '://') ||
      (this.config.get('NODE_ENV', { infer: true }) === 'development' && value.startsWith('exp://')) ||
      [this.config.get('BETTER_AUTH_URL', { infer: true }), ...this.config.get('AUTH_TRUSTED_ORIGINS', { infer: true })].includes(value);
  }
}
