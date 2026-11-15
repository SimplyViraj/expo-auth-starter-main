import { afterEach, describe, expect, it, vi } from 'vitest';
import { membershipApi } from '@/features/memberships/membership-api';
import { formatPrice } from '@/features/memberships/membership-contract';
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));
vi.mock('@/features/auth/services/auth-client', () => ({ authClient: { getCookie: vi.fn() }, revalidateAuthSession: vi.fn() }));
vi.mock('@/lib/api/base-url', () => ({ getApiBaseUrl: () => 'http://localhost:3000' }));
afterEach(() => vi.unstubAllGlobals());
describe('membership API transport', () => {
  it('reuses the purchase key on network retries without sending price or payment status', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValue(Response.json({ status: 'PENDING_PAYMENT' }));
    vi.stubGlobal('fetch', fetch);
    const input = { accountType: 'GROUP' as const, tier: 'CORE' as const, months: 3, accountId: 'account', programId: 'sleep-reset', catalogVersion: 'version', idempotencyKey: 'stable-key' };
    await expect(membershipApi.purchase(input)).rejects.toThrow('offline');
    await expect(membershipApi.purchase(input)).resolves.toEqual({ status: 'PENDING_PAYMENT' });
    const options = fetch.mock.calls.map(call => call[1]);
    expect(options[0]?.body).toBe(options[1]?.body);
    expect(JSON.parse(options[1]?.body as string)).not.toHaveProperty('amountPaise');
    expect(options[1]?.credentials).toBe('include');
  });
  it('refreshes payment through the backend without supplying a success assertion', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(Response.json({ status: 'PENDING_PAYMENT' }));
    vi.stubGlobal('fetch', fetch);
    await membershipApi.refresh('membership-id');
    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/memberships/membership-id/payment-refresh', expect.objectContaining({ method: 'POST', body: undefined }));
  });
  it('formats integer paise as INR', () => {
    expect(formatPrice(11299900)).toContain('1,12,999');
  });
  it.each(['PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'CANCELLED'])('preserves backend payment status %s', async status => {
    vi.stubGlobal('fetch', vi.fn<typeof globalThis.fetch>().mockResolvedValue(Response.json({ id: 'membership-id', status })));
    await expect(membershipApi.refresh('membership-id')).resolves.toEqual({ id: 'membership-id', status });
  });
  it.each([
    [503, 'PAYMENTS_UNAVAILABLE'], [409, 'PAYMENT_MISMATCH'],
    [409, 'PAYMENT_ALREADY_USED'], [500, 'INTERNAL_ERROR'],
  ])('propagates payment failure %s %s', async (status, code) => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(Response.json({ error: { code, message: 'Payment could not be verified' } }, { status }));
    vi.stubGlobal('fetch', fetch);
    await expect(membershipApi.refresh('membership-id')).rejects.toMatchObject({ status, code, message: 'Payment could not be verified' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('recovers after a payment refresh network failure', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(Response.json({ status: 'ACTIVE' }));
    vi.stubGlobal('fetch', fetch);
    await expect(membershipApi.refresh('membership-id')).rejects.toThrow('offline');
    await expect(membershipApi.refresh('membership-id')).resolves.toEqual({ status: 'ACTIVE' });
    expect(fetch.mock.calls.map(call => call[0])).toEqual(Array(2).fill('http://localhost:3000/api/memberships/membership-id/payment-refresh'));
  });
  it('sends cancellation actions without payment or mandate assertions', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => Response.json({ status: 'CANCELLED' }));
    vi.stubGlobal('fetch', fetch);
    await membershipApi.cancel('membership-id');
    await membershipApi.cancelRecurring('recurring-id');
    expect(fetch).toHaveBeenNthCalledWith(1, 'http://localhost:3000/api/memberships/membership-id/cancel', expect.objectContaining({ method: 'POST', body: undefined }));
    expect(fetch).toHaveBeenNthCalledWith(2, 'http://localhost:3000/api/memberships/recurring/recurring-id/cancel', expect.objectContaining({ method: 'POST', body: undefined }));
  });
});
