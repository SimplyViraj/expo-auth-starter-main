import { useState } from 'react';
import { AppText } from '@/components/ui/app-text';
import { Alert } from '@/components/feedback/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OtpCodeInput } from '@/features/auth/components/otp-code-input';
import { useOtpCooldown } from '@/features/auth/hooks/use-otp-cooldown';
import { phoneNumberSchema, phoneCodeSchema } from '@/features/auth/schemas/phone-schemas';
import { requestPhoneCode, confirmPhoneCode, type PhoneChallenge, type PhonePurpose } from '@/features/auth/services/phone-auth';

type Props = { purpose: PhonePurpose; initialPhone?: string; onVerified: () => Promise<void> };
export function PhoneCodeForm({ purpose, initialPhone = '', onVerified }: Props) {
  const [number, setNumber] = useState(initialPhone);
  const [challenge, setChallenge] = useState<PhoneChallenge | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'send' | 'confirm' | null>(null);
  const cooldown = useOtpCooldown(60, 0);
  const parsed = phoneNumberSchema.safeParse(number);
  async function send() {
    if (busy || cooldown.isCoolingDown) return;
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setBusy('send'); setError(null);
    try {
      const result = await requestPhoneCode(parsed.data, purpose);
      setNumber(parsed.data); setChallenge(result); setCode(''); cooldown.restart();
    } catch (e) { setError(e instanceof Error ? e.message : 'Check your connection and try again.'); }
    finally { setBusy(null); }
  }
  async function confirm() {
    if (busy || !challenge || !phoneCodeSchema.safeParse(code).success) return;
    setBusy('confirm'); setError(null);
    try {
      await confirmPhoneCode(challenge.challengeId, code, purpose);
      await onVerified();
    } catch (e) { setError(e instanceof Error ? e.message : 'Check your connection and try again.'); }
    finally { setBusy(null); }
  }
  return <>
    {!challenge ? <>
      <Input label="Mobile number" accessibilityLabel="Mobile number with country code" placeholder="+14155552671" value={number} onChangeText={setNumber} keyboardType="phone-pad" autoComplete="tel" autoCorrect={false} editable={!busy} />
      <AppText variant="caption" tone="muted">Include + and your country code. We will send an SMS verification code.</AppText>
      <Button label={cooldown.isCoolingDown ? 'Request code in ' + cooldown.secondsRemaining + 's' : 'Send SMS code'} loading={busy === 'send'} disabled={!parsed.success || !!busy || cooldown.isCoolingDown} onPress={() => void send()} />
    </> : <>
      <AppText tone="muted">{purpose === 'sign-in' ? 'If ' + number + ' is linked to an account, a code has been sent.' : 'Enter the SMS code sent to ' + number + '.'} Codes expire after ten minutes.</AppText>
      <OtpCodeInput value={code} onChange={setCode} accessibilityHint="Enter or paste the six-digit code from your text message" />
      <Button label={purpose === 'verify' ? 'Verify mobile number' : 'Sign in'} loading={busy === 'confirm'} disabled={!phoneCodeSchema.safeParse(code).success || !!busy} onPress={() => void confirm()} />
      <Button variant="secondary" label={cooldown.isCoolingDown ? 'Resend in ' + cooldown.secondsRemaining + 's' : 'Resend SMS code'} loading={busy === 'send'} disabled={cooldown.isCoolingDown || !!busy} onPress={() => void send()} />
      <Button variant="ghost" label="Use a different number" disabled={!!busy} onPress={() => { setChallenge(null); setCode(''); setError(null); }} />
    </>}
    {error ? <Alert title="Phone verification" body={error} tone="danger" /> : null}
  </>;
}
