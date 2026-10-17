import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDatabase, getSession, reportServerError } = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  getSession: vi.fn(),
  reportServerError: vi.fn(),
}));

vi.mock('@/server/auth/auth-server', () => ({
  getAuth: () => ({ api: { getSession } }),
}));

vi.mock('@/server/db', () => ({ getDatabase }));

vi.mock('@/server/observability/server-error-reporter', () => ({ reportServerError }));

import { PATCH } from '@/server/onboarding/onboarding-handler';

function onboardingRequest(body: unknown) {
  return new Request('https://app.example.com/api/onboarding', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('onboarding authorization', () => {
  beforeEach(() => {
    getDatabase.mockReset();
    getSession.mockReset();
    reportServerError.mockReset();
  });

  it('rejects a request without a server session before touching the database', async () => {
    getSession.mockResolvedValue(null);

    const response = await PATCH(onboardingRequest({ username: 'demo_user' }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(getDatabase).not.toHaveBeenCalled();
  });

  it('rejects invalid profile input before touching the database', async () => {
    getSession.mockResolvedValue({ user: { id: 'user-1' } });

    const response = await PATCH(onboardingRequest({ username: 'a' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('INVALID_PROFILE');
    expect(getDatabase).not.toHaveBeenCalled();
  });

  it('persists completion for the authenticated user', async () => {
    const completedAt = new Date('2026-08-02T12:00:00.000Z');
    const returning = vi.fn().mockResolvedValue([
      {
        id: 'user-1',
        username: 'demo_user',
        onboardingCompleted: true,
        onboardingCompletedAt: completedAt,
      },
    ]);
    const where = vi.fn(() => ({ returning }));
    const set = vi.fn(() => ({ where }));
    const update = vi.fn(() => ({ set }));

    getSession.mockResolvedValue({ user: { id: 'user-1' } });
    getDatabase.mockReturnValue({ update });

    const response = await PATCH(onboardingRequest({ username: '  Demo_User  ' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'demo_user',
        onboardingCompleted: true,
      }),
    );
    expect(body.user).toEqual({
      id: 'user-1',
      username: 'demo_user',
      onboardingCompleted: true,
      onboardingCompletedAt: completedAt.toISOString(),
    });
  });

  it('returns a safe conflict when the username is already taken', async () => {
    const uniqueError = Object.assign(new Error('duplicate key details'), { code: '23505' });
    const returning = vi.fn().mockRejectedValue(uniqueError);
    const where = vi.fn(() => ({ returning }));
    const set = vi.fn(() => ({ where }));
    const update = vi.fn(() => ({ set }));

    getSession.mockResolvedValue({ user: { id: 'user-1' } });
    getDatabase.mockReturnValue({ update });

    const response = await PATCH(onboardingRequest({ username: 'already_taken' }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toEqual({
      code: 'USERNAME_TAKEN',
      message: 'That username is already taken. Try another one.',
    });
    expect(reportServerError).not.toHaveBeenCalled();
  });

  it('reports an unexpected persistence failure without returning details', async () => {
    getSession.mockResolvedValue({ user: { id: 'user-1' } });
    getDatabase.mockImplementation(() => {
      throw new Error('secret database details');
    });

    const response = await PATCH(onboardingRequest({ username: 'demo_user' }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('PROFILE_UPDATE_FAILED');
    expect(reportServerError).toHaveBeenCalledWith({ event: 'onboarding.profile-update-failed' });
  });
});
