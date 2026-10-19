import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../../config/env.validation.js';
import { reportOperationalFailure } from '../../../common/logging/operational-logger.js';
import { appIdentity } from '../../../config/configuration.js';

export type OtpEmail = {
  email: string;
  otp: string;
  type: 'sign-in' | 'email-verification' | 'forget-password' | 'change-email';
};

@Injectable()
export class EmailProvider {
  constructor(private readonly config: ConfigService<Environment, true>) {}
  async sendOtp(message: OtpEmail) {
    const purpose = {
      'sign-in': 'Sign in',
      'email-verification': 'Verify your email',
      'forget-password': 'Reset your password',
      'change-email': 'Confirm your new email',
    }[message.type];
    let response: Response;
    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + this.config.get('RESEND_API_KEY', { infer: true }),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.config.get('EMAIL_FROM', { infer: true }),
          to: [message.email],
          subject: purpose + ' - ' + appIdentity.name,
          text: purpose + ': ' + message.otp + '\nThis code expires in five minutes. If you did not request it, ignore this email.',
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      reportOperationalFailure('email.delivery-failed');
      throw new Error('Email delivery failed');
    }
    if (!response.ok) {
      reportOperationalFailure('email.delivery-failed', response.status);
      throw new Error('Email delivery failed');
    }
  }
}
