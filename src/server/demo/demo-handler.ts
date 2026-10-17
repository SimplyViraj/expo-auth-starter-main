import type { ProtectedDemoResponse, PublicDemoResponse } from '@/types/demo-api';
import { getAuth } from '@/server/auth/auth-server';
import { reportServerError } from '@/server/observability/server-error-reporter';

export function getPublicDemo() {
  const response: PublicDemoResponse = {
    tip: {
      title: 'Public transmission received',
      body: 'Today’s reminder: drink some water, stretch, and pretend your inbox does not exist for five minutes.',
    },
  };

  return Response.json(response, {
    headers: { 'Cache-Control': 'public, max-age=60' },
  });
}

export async function getProtectedDemo(request: Request) {
  try {
    const session = await getAuth().api.getSession({ headers: request.headers });

    if (!session) {
      return errorResponse(401, 'UNAUTHORIZED', 'Sign in to view this information.');
    }

    if (!session.user.onboardingCompleted) {
      return errorResponse(403, 'PROFILE_INCOMPLETE', 'Complete your profile to continue.');
    }

    const response: ProtectedDemoResponse = {
      workspace: {
        title: 'Top secret unlocked',
        body: 'Your mission: finish one important task before opening another browser tab.',
      },
    };

    return Response.json(response, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch {
    reportServerError({ event: 'demo.protected-request-failed' });
    return errorResponse(500, 'REQUEST_FAILED', 'We could not load this information. Please try again.');
  }
}

function errorResponse(status: number, code: string, message: string) {
  return Response.json(
    { error: { code, message } },
    {
      status,
      headers: { 'Cache-Control': 'private, no-store' },
    },
  );
}
