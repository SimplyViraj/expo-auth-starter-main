import { createAuthEndpoint, getSessionFromCtx, APIError } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import type { BetterAuthPlugin } from 'better-auth';
import { z } from 'zod';
import { authPolicy } from '../../../config/configuration.js';
import type { PhoneService } from '../../phone/phone.service.js';
import { PhoneError } from '../../phone/phone-error.js';

const sendBody = z.object({ phoneNumber: z.string().regex(/^\+[1-9]\d{7,14}$/, 'Use international format, for example +14155552671'), purpose: z.enum(['verify', 'sign-in']) }).strict();
const confirmBody = z.object({ challengeId: z.uuid(), code: z.string().regex(/^\d{6}$/) }).strict();
async function run<T>(operation: () => Promise<T>): Promise<T> {
  try { return await operation(); } catch (error) {
    if (error instanceof PhoneError) throw new APIError(error.status, { code: error.code, message: error.message });
    throw error;
  }
}
const metadata = (summary: string) => ({ openapi: { summary, responses: { 200: { description: 'Success' }, 400: { description: 'Invalid number, code or challenge' }, 401: { description: 'Sign in required' }, 429: { description: 'Too many requests' }, 503: { description: 'SMS provider unavailable' } } } });

export function phoneAuth(phone: PhoneService) {
  return {
    id: 'phone-auth',
    endpoints: {
      sendPhoneCode: createAuthEndpoint('/phone/send-code', { method: 'POST', body: sendBody, metadata: metadata('Request a Twilio Verify SMS for onboarding or phone login') }, async (ctx) => {
        const session = ctx.body.purpose === 'verify' ? await getSessionFromCtx(ctx) : null;
        if (ctx.body.purpose === 'verify') {
          if (!session) throw new APIError('UNAUTHORIZED', { code: 'UNAUTHORIZED', message: 'Sign in to verify your phone.' });
          if (Date.now() - new Date(session.session.createdAt).getTime() > authPolicy.sensitiveActionFreshnessSeconds * 1000) throw new APIError('FORBIDDEN', { code: 'FRESH_SESSION_REQUIRED', message: 'Sign in again before verifying a phone number.' });
        }
        return ctx.json(await run(() => phone.send(ctx.body.phoneNumber, ctx.body.purpose, session?.user.id)));
      }),
      verifyOnboardingPhone: createAuthEndpoint('/phone/verify', { method: 'POST', body: confirmBody, metadata: metadata('Verify and link a phone number to the signed-in account') }, async (ctx) => {
        const session = await getSessionFromCtx(ctx);
        if (!session) throw new APIError('UNAUTHORIZED', { code: 'UNAUTHORIZED', message: 'Sign in to verify your phone.' });
        if (Date.now() - new Date(session.session.createdAt).getTime() > authPolicy.sensitiveActionFreshnessSeconds * 1000) throw new APIError('FORBIDDEN', { code: 'FRESH_SESSION_REQUIRED', message: 'Sign in again before verifying a phone number.' });
        await run(() => phone.confirm(ctx.body.challengeId, ctx.body.code, 'verify', session.user.id));
        return ctx.json({ status: true });
      }),
      signInWithPhoneCode: createAuthEndpoint('/phone/sign-in', { method: 'POST', body: confirmBody, metadata: metadata('Sign in to an existing account using a verified phone and SMS code') }, async (ctx) => {
        const verified = await run(() => phone.confirm(ctx.body.challengeId, ctx.body.code, 'sign-in'));
        const user = await ctx.context.internalAdapter.findUserById(verified.id);
        if (!user) throw new APIError('UNAUTHORIZED', { code: 'UNAUTHORIZED', message: 'Sign in again.' });
        const session = await ctx.context.internalAdapter.createSession(user.id);
        if (!session) throw new APIError('INTERNAL_SERVER_ERROR', { code: 'SESSION_FAILED', message: 'Could not create a session.' });
        await setSessionCookie(ctx, { session, user });
        return ctx.json({ status: true });
      }),
    },
    rateLimit: [
      { pathMatcher: (p: string) => p === '/phone/send-code', window: 60, max: 3 },
      { pathMatcher: (p: string) => p === '/phone/verify' || p === '/phone/sign-in', window: 60, max: 10 },
    ],
  } satisfies BetterAuthPlugin;
}
