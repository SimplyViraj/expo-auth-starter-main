import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { TwilioVerifyProvider } from './twilio-verify.provider.js';
import type { Environment } from '../../../config/env.validation.js';
const sid = 'VE' + 'a'.repeat(32);
const config = new ConfigService<Environment, true>({ TWILIO_ACCOUNT_SID: 'AC' + 'b'.repeat(32), TWILIO_AUTH_TOKEN: 'c'.repeat(32), TWILIO_VERIFY_SERVICE_SID: 'VA' + 'd'.repeat(32) });
afterEach(() => { jest.restoreAllMocks(); });
describe('Twilio Verify transport', () => {
  it('starts SMS verification using authenticated, timed-out form requests without providing a generated code', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ sid, status: 'pending' })));
    expect(await new TwilioVerifyProvider(config).send('+14155552671')).toBe(sid);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('https://verify.twilio.com/v2/Services/VA' + 'd'.repeat(32) + '/Verifications');
    expect(options?.headers).toMatchObject({ Authorization: expect.stringMatching(/^Basic /), 'Content-Type': 'application/x-www-form-urlencoded' });
    expect(String(options?.body)).toBe('To=%2B14155552671&Channel=sms');
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });
  it('checks a stored VerificationSid and only accepts approved status', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{"status":"pending"}')).mockResolvedValueOnce(new Response('{"status":"approved"}'));
    const provider = new TwilioVerifyProvider(config);
    expect(await provider.check(sid, '123456')).toBe(false);
    expect(await provider.check(sid, '123456')).toBe(true);
    expect(String(fetch.mock.calls[0][1]?.body)).toBe('VerificationSid=' + sid + '&Code=123456');
  });
  it('treats deleted or expired Twilio verifications as invalid', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"code":20404}', { status: 404 }));
    expect(await new TwilioVerifyProvider(config).check(sid, '123456')).toBe(false);
  });
  it('maps provider throttling to a safe retry error', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"code":60203}', { status: 429 }));
    await expect(new TwilioVerifyProvider(config).send('+14155552671')).rejects.toMatchObject({ status: 429, code: 'PHONE_RATE_LIMITED' });
  });
  it('hides network errors and rejects malformed provider success bodies', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('private account token')).mockResolvedValueOnce(new Response('{"status":"approved"}'));
    const provider = new TwilioVerifyProvider(config);
    await expect(provider.send('+14155552671')).rejects.toMatchObject({ code: 'PHONE_DELIVERY_FAILED' });
    await expect(provider.send('+14155552671')).rejects.toMatchObject({ code: 'PHONE_DELIVERY_FAILED' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('fails closed without configured credentials and never makes an HTTP request', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch');
    await expect(new TwilioVerifyProvider(new ConfigService<Environment, true>({})).send('+14155552671')).rejects.toMatchObject({ code: 'PHONE_NOT_CONFIGURED' });
    expect(fetch).not.toHaveBeenCalled();
  });
});
