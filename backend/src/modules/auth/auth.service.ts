import { PhoneService } from '../phone/phone.service.js';
import { phoneAuth } from './providers/phone-auth.plugin.js';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth/minimal';
import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import { emailOTP, openAPI } from 'better-auth/plugins';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import type { Request, Response } from 'express';
import { PrismaService } from '../../database/prisma.service.js';
import type { Environment } from '../../config/env.validation.js';
import { appIdentity, authPolicy } from '../../config/configuration.js';
import { EmailProvider } from '../identity/providers/email.provider.js';
import { IdentityService } from '../identity/identity.service.js';

function createAuth(prisma: PrismaService, config: ConfigService<Environment, true>, identity: IdentityService, email: EmailProvider, phone: PhoneService) {
  return betterAuth({
    appName: appIdentity.name,
    baseURL: config.get('BETTER_AUTH_URL', { infer: true }),
    secret: config.get('BETTER_AUTH_SECRET', { infer: true }),
    database: prismaAdapter(prisma, { provider: 'postgresql', transaction: true }),
    logger: { disabled: true },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: authPolicy.minimumPasswordLength,
      maxPasswordLength: authPolicy.maximumPasswordLength,
      revokeSessionsOnPasswordReset: true,
    },
    emailVerification: { sendOnSignUp: true, sendOnSignIn: true, autoSignInAfterVerification: true },
    user: {
      additionalFields: {
        phoneNumber: { type: 'string', required: false, input: false },
        phoneNumberVerified: { type: 'boolean', required: true, defaultValue: false, input: false },
        phoneNumberVerifiedAt: { type: 'date', required: false, input: false },
        username: { type: 'string', required: false, input: false },
        onboardingCompleted: { type: 'boolean', required: true, defaultValue: false, input: false },
        onboardingCompletedAt: { type: 'date', required: false, input: false },
      },
      deleteUser: { enabled: true },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if ((ctx.path === '/update-user' || ctx.path === '/sign-up/email') && ctx.body?.image !== undefined) {
          throw new APIError('BAD_REQUEST', { code: 'USE_PHOTO_UPLOAD', message: 'Use the profile photo upload to change your photo.' });
        }
        if (ctx.path !== '/delete-user') return;
        const session = await getSessionFromCtx(ctx);
        if (!session) return;
        const credential = await prisma.account.findFirst({
          where: { userId: session.user.id, providerId: 'credential', password: { not: null } },
          select: { id: true },
        });
        if (credential && !ctx.body?.password) {
          throw new APIError('BAD_REQUEST', { code: 'PASSWORD_REQUIRED', message: 'Confirm your current password to delete your account.' });
        }
      }),
    },
    account: { encryptOAuthTokens: true, accountLinking: { enabled: true } },
    session: { expiresIn: 60 * 60 * 24 * 30, freshAge: authPolicy.sensitiveActionFreshnessSeconds, updateAge: 60 * 60 * 24, deferSessionRefresh: true },
    rateLimit: { enabled: true, window: 60, max: 100, storage: 'database' },
    // This header is ALWAYS overwritten from the socket in handle().
    advanced: { ipAddress: { ipAddressHeaders: ['x-backend-client-ip'] } },
    trustedOrigins: identity.trustedOrigins(),
    socialProviders: identity.providers(),
    plugins: [
      expo(),
      phoneAuth(phone),
      emailOTP({
        overrideDefaultEmailVerification: true,
        otpLength: 6,
        expiresIn: 300,
        allowedAttempts: 3,
        storeOTP: 'hashed',
        rateLimit: { window: 60, max: 3 },
        sendVerificationOTP: (message) => email.sendOtp(message),
      }),
      openAPI({ disableDefaultReference: true }),
    ],
  });
}

@Injectable()
export class AuthService {
  readonly engine: ReturnType<typeof createAuth>;
  private readonly nodeHandler: ReturnType<typeof toNodeHandler>;
  constructor(prisma: PrismaService, config: ConfigService<Environment, true>, identity: IdentityService, email: EmailProvider, phone: PhoneService) {
    this.engine = createAuth(prisma, config, identity, email, phone);
    this.nodeHandler = toNodeHandler(this.engine);
  }
  handle(request: Request, response: Response) {
    request.headers['x-backend-client-ip'] = request.socket.remoteAddress ?? '127.0.0.1';
    // Do not let arbitrary forwarded headers determine the request protocol.
    delete request.headers['x-forwarded-proto'];
    return this.nodeHandler(request, response);
  }
  getSession(request: Request) {
    return this.engine.api.getSession({ headers: fromNodeHeaders(request.headers) });
  }
}
export type AuthSession = NonNullable<Awaited<ReturnType<AuthService['getSession']>>>;
