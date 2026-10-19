import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSession, reportServerError } = vi.hoisted(() => ({
  getSession: vi.fn(),
  reportServerError: vi.fn(),
}));

vi.mock('@/server/auth/auth-server', () => ({
  getAuth: () => ({ api: { getSession } }),
}));

vi.mock('@/server/observability/server-error-reporter', () => ({ reportServerError }));

import { getProtectedDemo, getPublicDemo } from '@/server/demo/demo-handler';

describe('demo API authorization', () => {
  beforeEach(() => {
    getSession.mockReset();
    reportServerError.mockReset();
  });

  it('keeps the public endpoint available without a session', async () => {
    const response = getPublicDemo();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
    expect(body.tip.title).toBeTruthy();
  });

  it('rejects a protected request without a server session', async () => {
    getSession.mockResolvedValue(null);

    const response = await getProtectedDemo(new Request('https://app.example.com/api/demo/protected'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects an authenticated user who has not completed onboarding', async () => {
    getSession.mockResolvedValue({
      user: { name: 'Demo User', onboardingCompleted: false },
    });

    const response = await getProtectedDemo(new Request('https://app.example.com/api/demo/protected'));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('PROFILE_INCOMPLETE');
  });

  it('returns private information for an authorized completed user', async () => {
    getSession.mockResolvedValue({
      user: { name: 'Demo User', onboardingCompleted: true },
    });

    const response = await getProtectedDemo(new Request('https://app.example.com/api/demo/protected'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(body.workspace.title).toBe('Top secret unlocked');
  });

  it('reports an unexpected protected-request failure without returning details', async () => {
    getSession.mockRejectedValue(new Error('secret provider details'));

    const response = await getProtectedDemo(new Request('https://app.example.com/api/demo/protected'));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('REQUEST_FAILED');
    expect(reportServerError).toHaveBeenCalledWith({ event: 'demo.protected-request-failed' });
  });
});
