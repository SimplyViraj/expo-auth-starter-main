import { appConfig } from '@/constants/app-config';
import { getServerEnv } from '@/server/env';
import { reportServerError } from '@/server/observability/server-error-reporter';

type AuthOtpEmail = {
  recipient: string;
  code: string;
  purpose: 'sign-in' | 'email-verification' | 'forget-password' | 'change-email';
};

type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export async function sendAuthOtpEmail(email: AuthOtpEmail) {
  const env = getServerEnv();
  const message = createAuthEmailMessage(email);

  let response: Response;

  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    reportServerError({ event: 'email.delivery-failed', purpose: email.purpose });
    throw new Error('Email delivery failed');
  }

  if (!response.ok) {
    reportServerError({
      event: 'email.delivery-failed',
      purpose: email.purpose,
      providerStatus: response.status,
    });
    throw new Error(`Email delivery failed with provider status ${response.status}`);
  }
}

function createAuthEmailMessage(email: AuthOtpEmail): EmailMessage {
  const content = getOtpEmailContent(email.purpose);
  const safeCode = escapeHtml(email.code);

  return {
    to: email.recipient,
    subject: content.subject,
    text: `${content.instruction}\n\n${email.code}\n\nThis code expires in five minutes.${content.securityNote}`,
    html: `<p>${content.instruction}</p><p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${safeCode}</p><p>This code expires in five minutes.${content.securityNote}</p>`,
  };
}

function getOtpEmailContent(purpose: AuthOtpEmail['purpose']) {
  switch (purpose) {
    case 'email-verification':
      return {
        subject: `Verify your ${appConfig.name} email`,
        instruction: `Enter this verification code in ${appConfig.name}:`,
        securityNote: '',
      };
    case 'forget-password':
      return {
        subject: `Reset your ${appConfig.name} password`,
        instruction: `Enter this code in ${appConfig.name} to reset your password:`,
        securityNote: ' If you did not request it, you can ignore this email.',
      };
    case 'sign-in':
      return {
        subject: `Your ${appConfig.name} sign-in code`,
        instruction: `Enter this code in ${appConfig.name} to sign in:`,
        securityNote: ' If you did not request it, you can ignore this email.',
      };
    case 'change-email':
      return {
        subject: `Confirm your new ${appConfig.name} email`,
        instruction: `Enter this code in ${appConfig.name} to confirm your new email:`,
        securityNote: ' If you did not request it, you can ignore this email.',
      };
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };

    return entities[character];
  });
}
