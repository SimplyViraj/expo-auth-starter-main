import { beforeEach, describe, expect, it, vi } from 'vitest';
import { phoneNumberSchema, phoneCodeSchema } from '@/features/auth/schemas/phone-schemas';
import { requestPhoneCode, confirmPhoneCode } from '@/features/auth/services/phone-auth';
import { authClient } from '@/features/auth/services/auth-client';
vi.mock('@/features/auth/services/auth-client', () => ({ authClient: { $fetch: vi.fn() } }));
const fetch = vi.mocked(authClient.$fetch);
beforeEach(() => { fetch.mockReset(); });
describe('phone input', () => {
  it('normalizes display separators while preserving international country codes', () => {
    expect(phoneNumberSchema.parse(' +1 (415) 555-2671 ')).toBe('+14155552671');
    expect(phoneNumberSchema.parse('+919876543210')).toBe('+919876543210');
  });
  it.each(['4155552671', '+0123456789', 'abc', '+1234567890123456'])('rejects invalid or ambiguous numbers %s', (value) => {
    expect(phoneNumberSchema.safeParse(value).success).toBe(false);
  });
  it('requires exactly six numeric digits', () => {
    expect(phoneCodeSchema.safeParse('123456').success).toBe(true);
    for (const value of ['12345', '1234567', 'abcdef']) expect(phoneCodeSchema.safeParse(value).success).toBe(false);
  });
});
describe('phone authentication service', () => {
  it('uses the authenticated Better Auth fetch transport and an explicit verification purpose', async () => {
    fetch.mockResolvedValue({ data: { challengeId: 'challenge', expiresIn: 600, resendAfter: 60 }, error: null });
    await requestPhoneCode('+1 (415) 555-2671', 'verify');
    expect(fetch).toHaveBeenCalledWith('/phone/send-code', { method: 'POST', body: { phoneNumber: '+14155552671', purpose: 'verify' } });
  });
  it('keeps linking and login on separate endpoints and does not resend the phone number with a code', async () => {
    fetch.mockResolvedValue({ data: { status: true }, error: null });
    await confirmPhoneCode('challenge', '123456', 'verify');
    await confirmPhoneCode('challenge', '123456', 'sign-in');
    expect(fetch).toHaveBeenNthCalledWith(1, '/phone/verify', { method: 'POST', body: { challengeId: 'challenge', code: '123456' } });
    expect(fetch).toHaveBeenNthCalledWith(2, '/phone/sign-in', { method: 'POST', body: { challengeId: 'challenge', code: '123456' } });
  });
  it('propagates safe server errors and rejects an empty response', async () => {
    fetch.mockResolvedValueOnce({ data: null, error: { message: 'Wait before retrying.', status: 429, statusText: 'Too Many Requests' } });
    await expect(requestPhoneCode('+14155552671', 'sign-in')).rejects.toThrow('Wait before retrying.');
    fetch.mockResolvedValueOnce({ data: null, error: null });
    await expect(confirmPhoneCode('challenge', '123456', 'sign-in')).rejects.toThrow('invalid response');
  });
});
