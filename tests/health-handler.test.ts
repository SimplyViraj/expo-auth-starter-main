import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { execute, reportServerError } = vi.hoisted(() => ({
  execute: vi.fn(),
  reportServerError: vi.fn(),
}));

vi.mock('@/server/db', () => ({
  getDatabase: () => ({ execute }),
}));

vi.mock('@/server/observability/server-error-reporter', () => ({ reportServerError }));

import { GET } from '@/server/health/health-handler';

describe('health response disclosure', () => {
  beforeEach(() => {
    execute.mockReset();
    reportServerError.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('keeps useful database diagnostics in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    execute.mockResolvedValue(undefined);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(body).toMatchObject({ status: 'ok', database: 'reachable' });
    expect(body.latencyMs).toEqual(expect.any(Number));
  });

  it('returns only service availability in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    execute.mockResolvedValue(undefined);

    const response = await GET();

    expect(await response.json()).toEqual({ status: 'ok' });
  });

  it('reports a failed check without exposing database details in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    execute.mockRejectedValue(new Error('secret connection details'));

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 'unavailable' });
    expect(reportServerError).toHaveBeenCalledWith({ event: 'health.database-check-failed' });
  });
});
