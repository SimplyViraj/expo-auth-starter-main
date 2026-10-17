import { eq } from 'drizzle-orm';

import { completeOnboardingSchema, type CompleteOnboardingResponse } from '@/features/onboarding/onboarding-contract';
import { getAuth } from '@/server/auth/auth-server';
import { getDatabase } from '@/server/db';
import { user } from '@/server/db/auth-schema';
import { reportServerError } from '@/server/observability/server-error-reporter';

export async function PATCH(request: Request) {
  try {
    return await completeOnboarding(request);
  } catch {
    reportServerError({ event: 'onboarding.profile-update-failed' });
    return errorResponse(500, 'PROFILE_UPDATE_FAILED', 'We could not update your profile. Please try again.');
  }
}

async function completeOnboarding(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });

  if (!session) {
    return errorResponse(401, 'UNAUTHORIZED', 'Sign in to complete your profile.');
  }

  const body = await readJson(request);
  const result = completeOnboardingSchema.safeParse(body);

  if (!result.success) {
    return errorResponse(400, 'INVALID_PROFILE', result.error.issues[0]?.message ?? 'Check your profile details.');
  }

  const completedAt = new Date();
  let updatedUser;

  try {
    [updatedUser] = await getDatabase()
      .update(user)
      .set({
        username: result.data.username,
        onboardingCompleted: true,
        onboardingCompletedAt: completedAt,
      })
      .where(eq(user.id, session.user.id))
      .returning({
        id: user.id,
        username: user.username,
        onboardingCompleted: user.onboardingCompleted,
        onboardingCompletedAt: user.onboardingCompletedAt,
      });
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return errorResponse(409, 'USERNAME_TAKEN', 'That username is already taken. Try another one.');
    }

    throw error;
  }

  if (!updatedUser?.username || !updatedUser.onboardingCompleted || !updatedUser.onboardingCompletedAt) {
    return errorResponse(404, 'ACCOUNT_NOT_FOUND', 'We could not update your profile. Please sign in again.');
  }

  const response: CompleteOnboardingResponse = {
    user: {
      id: updatedUser.id,
      username: updatedUser.username,
      onboardingCompleted: true,
      onboardingCompletedAt: updatedUser.onboardingCompletedAt.toISOString(),
    },
  };

  return Response.json(response, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

function isUniqueConstraintViolation(error: unknown) {
  let current = error;

  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || typeof current !== 'object') return false;
    if ('code' in current && current.code === '23505') return true;
    current = 'cause' in current ? current.cause : null;
  }

  return false;
}

async function readJson(request: Request) {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}

function errorResponse(status: number, code: string, message: string) {
  return Response.json(
    { error: { code, message } },
    { status, headers: { 'Cache-Control': 'private, no-store' } },
  );
}
