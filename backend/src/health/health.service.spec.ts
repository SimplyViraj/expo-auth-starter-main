import { describe, expect, it, jest } from '@jest/globals';
import { HealthService } from './health.service.js';
import type { PrismaService } from '../database/prisma.service.js';

describe('database readiness', () => {
  it('returns ready only after a successful database query', async () => {
    const query = jest.fn<() => Promise<unknown>>().mockResolvedValue([1]);
    const service = new HealthService({ $queryRaw: query } as unknown as PrismaService);
    await expect(service.readiness()).resolves.toEqual({ status: 'ok' });
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('reports database failure as 503 without leaking the underlying error', async () => {
    const query = jest.fn<() => Promise<unknown>>().mockRejectedValue(new Error('private connection data'));
    const service = new HealthService({ $queryRaw: query } as unknown as PrismaService);
    await expect(service.readiness()).rejects.toMatchObject({ status: 503, response: { error: { code: 'DATABASE_UNAVAILABLE', message: 'Service unavailable.' } } });
  });
});
