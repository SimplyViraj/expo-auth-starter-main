import { afterEach, describe, expect, it, vi } from 'vitest';

import { revalidateAuthSession } from '@/features/auth/services/auth-client';
import { apiRequest } from '@/lib/api/api-client';

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));
vi.mock('@/features/auth/services/auth-client', () => ({ authClient: { getCookie: vi.fn() }, revalidateAuthSession: vi.fn() }));
vi.mock('@/lib/api/base-url', () => ({ getApiBaseUrl: () => 'http://localhost:3000' }));

afterEach(() => { vi.unstubAllGlobals(); });

describe('protected profile API transport', () => {
  it('sends authenticated profile reads with an abort signal', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(Response.json({ user: { id: 'member-a' } }));
    vi.stubGlobal('fetch', fetch);
    const controller = new AbortController();
    await expect(apiRequest('/api/profile', { signal: controller.signal })).resolves.toEqual({ user: { id: 'member-a' } });
    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/profile', expect.objectContaining({ signal: controller.signal, credentials: 'include' }));
  });

  it.each([
    [401, 'UNAUTHORIZED'],
    [403, 'PROFILE_INCOMPLETE'],
  ])('refreshes route authorization after %s %s', async (status, code) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: { code, message: 'Sign in or complete setup.' } }, { status })));
    await expect(apiRequest('/api/profile')).rejects.toMatchObject({ status, code });
    expect(revalidateAuthSession).toHaveBeenCalledOnce();
  });

  it('preserves username conflict feedback without invalidating the session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: { code: 'USERNAME_TAKEN', message: 'Choose another username.' } }, { status: 409 })));
    await expect(apiRequest('/api/profile', { method: 'PATCH', body: { username: 'taken' } })).rejects.toMatchObject({ status: 409, code: 'USERNAME_TAKEN', message: 'Choose another username.' });
    expect(revalidateAuthSession).not.toHaveBeenCalled();
  });

  it('propagates request cancellation instead of retrying or changing auth state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError')));
    await expect(apiRequest('/api/profile')).rejects.toMatchObject({ name: 'AbortError' });
    expect(revalidateAuthSession).not.toHaveBeenCalled();
  });
});
