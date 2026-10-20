import { authClient } from '@/features/auth/services/auth-client';
import { phoneNumberSchema, phoneCodeSchema } from '@/features/auth/schemas/phone-schemas';
export type PhonePurpose = 'verify' | 'sign-in';
export type PhoneChallenge = { challengeId: string; expiresIn: number; resendAfter: number };
export class PhoneRequestError extends Error {
  constructor(message: string, readonly code?: string) { super(message); }
}
async function request<T>(path: string, body: unknown): Promise<T> {
  const result = await authClient.$fetch<T>(path, { method: 'POST', body });
  if (result.error) throw new PhoneRequestError(result.error.message ?? 'Could not complete phone verification. Please try again.', (result.error as { code?: string }).code);
  if (!result.data) throw new PhoneRequestError('The server returned an invalid response. Please try again.');
  return result.data;
}
export function requestPhoneCode(phoneNumber: string, purpose: PhonePurpose) {
  return request<PhoneChallenge>('/phone/send-code', { phoneNumber: phoneNumberSchema.parse(phoneNumber), purpose });
}
export function confirmPhoneCode(challengeId: string, code: string, purpose: PhonePurpose) {
  return request<{ status: boolean }>(purpose === 'verify' ? '/phone/verify' : '/phone/sign-in', { challengeId, code: phoneCodeSchema.parse(code) });
}
