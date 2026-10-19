import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { EmailProvider } from './email.provider.js';
import type { Environment } from '../../../config/env.validation.js';

const config = new ConfigService<Environment, true>({ RESEND_API_KEY: 're_private', EMAIL_FROM: 'App <sender@example.com>' });
afterEach(() => { jest.restoreAllMocks(); });
describe('email transport', () => {
  it('sends the OTP through Resend with authentication and a timeout', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    await new EmailProvider(config).sendOtp({ email: 'recipient@example.com', otp: '123456', type: 'email-verification' });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(options?.headers).toMatchObject({ Authorization: 'Bearer re_private' });
    expect(JSON.parse(options?.body as string)).toMatchObject({ from: 'App <sender@example.com>', to: ['recipient@example.com'], text: expect.stringContaining('123456') });
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });
  it('rejects provider failures with a safe error', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('private provider details', { status: 503 }));
    await expect(new EmailProvider(config).sendOtp({ email: 'recipient@example.com', otp: '123456', type: 'forget-password' })).rejects.toThrow('Email delivery failed');
  });
  it('does not swallow network failures', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('private network detail'));
    await expect(new EmailProvider(config).sendOtp({ email: 'recipient@example.com', otp: '123456', type: 'forget-password' })).rejects.toThrow('Email delivery failed');
  });
});
