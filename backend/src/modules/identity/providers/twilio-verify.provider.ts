import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Buffer } from 'node:buffer';
import type { Environment } from '../../../config/env.validation.js';
import { PhoneError } from '../../phone/phone-error.js';

@Injectable()
export class TwilioVerifyProvider {
  constructor(private readonly config: ConfigService<Environment, true>) {}
  private async post(resource: string, body: URLSearchParams) {
    const account = this.config.get('TWILIO_ACCOUNT_SID', { infer: true });
    const token = this.config.get('TWILIO_AUTH_TOKEN', { infer: true });
    const service = this.config.get('TWILIO_VERIFY_SERVICE_SID', { infer: true });
    if (!account || !token || !service) throw new PhoneError(503, 'PHONE_NOT_CONFIGURED', 'Phone verification is temporarily unavailable.');
    try {
      const response = await fetch('https://verify.twilio.com/v2/Services/' + service + '/' + resource, {
        method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(account + ':' + token).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
        body, signal: AbortSignal.timeout(10_000),
      });
      const data = await response.json() as { sid?: string; status?: string; code?: number };
      if (response.status === 404 && resource === 'VerificationCheck') return { status: 'expired' };
      if (response.status === 429 || data.code === 60202 || data.code === 60203) throw new PhoneError(429, 'PHONE_RATE_LIMITED', 'Too many requests. Wait before requesting a new code.');
      if (!response.ok) {
        if (data.code === 60200 || data.code === 21211) throw new PhoneError(400, 'INVALID_PHONE_NUMBER', 'Enter a valid mobile number including its country code.');
        throw new Error('Provider rejected request');
      }
      return data;
    } catch (error) {
      if (error instanceof PhoneError) throw error;
      throw new PhoneError(503, 'PHONE_DELIVERY_FAILED', 'The verification service is unavailable. Please try again later.');
    }
  }
  async send(phoneNumber: string): Promise<string> {
    const data = await this.post('Verifications', new URLSearchParams({ To: phoneNumber, Channel: 'sms' }));
    if (data.status !== 'pending' || !data.sid || !/^VE[0-9a-f]{32}$/i.test(data.sid)) throw new PhoneError(503, 'PHONE_DELIVERY_FAILED', 'The verification service could not send a code.');
    return data.sid;
  }
  async check(verificationSid: string, code: string) {
    const data = await this.post('VerificationCheck', new URLSearchParams({ VerificationSid: verificationSid, Code: code }));
    return data.status === 'approved';
  }
}
