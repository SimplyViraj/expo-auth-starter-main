import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeroPanel } from '@/components/ui/hero-panel';
import { Screen } from '@/components/ui/screen';
import { getEmailOtpErrorMessage } from '@/features/auth/auth-errors';
import { useAuth } from '@/features/auth/auth-provider';
import { OtpCodeInput } from '@/features/auth/components/otp-code-input';
import { useOtpCooldown } from '@/features/auth/hooks/use-otp-cooldown';
import { verifyEmailOtpSchema, type VerifyEmailOtpValues } from '@/features/auth/validation/auth-schemas';
import { authClient } from '@/lib/auth/auth-client';
import { appToast } from '@/lib/toast/app-toast';

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const email = getStringParam(params.email)?.trim().toLowerCase() ?? '';
  const { refreshSession } = useAuth();
  const { isCoolingDown, restart: restartCooldown, secondsRemaining } = useOtpCooldown();
  const [isResending, setIsResending] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isValid },
  } = useForm<VerifyEmailOtpValues>({
    resolver: zodResolver(verifyEmailOtpSchema),
    defaultValues: { otp: '' },
    mode: 'onChange',
  });

  async function submit(values: VerifyEmailOtpValues) {
    if (!email) return;

    try {
      const result = await authClient.emailOtp.verifyEmail({ email, otp: values.otp.trim() });

      if (result.error) {
        appToast.error('Verification failed', { description: getEmailOtpErrorMessage(result.error) });
        return;
      }

      await refreshSession();
      appToast.success('Email verified');
    } catch {
      appToast.error('Verification failed', {
        description: 'Check your connection and try again.',
      });
    }
  }

  async function resend() {
    if (!email || isCoolingDown) return;

    setIsResending(true);

    try {
      const result = await authClient.emailOtp.sendVerificationOtp({ email, type: 'email-verification' });

      if (result.error) {
        appToast.error('Code request failed', { description: getEmailOtpErrorMessage(result.error) });
        return;
      }

      restartCooldown();
      appToast.success('Verification code requested', {
        description: 'Check your email for the new code.',
      });
    } catch {
      appToast.error('Code request failed', {
        description: 'Check your connection and try again.',
      });
    } finally {
      setIsResending(false);
    }
  }

  if (!email) {
    return (
      <Screen>
        <HeroPanel
          eyebrow="Email verification"
          title="Enter your account email first."
          body="Return to sign in. If your account still needs verification, signing in will send a fresh code."
        />
        <Alert
          title="Email address unavailable"
          body="For your security, verification requires the email address used to create the account."
          tone="warning"
        />
        <Link href="/sign-in" asChild>
          <Button label="Back to sign in" />
        </Link>
      </Screen>
    );
  }

  return (
    <Screen>
      <HeroPanel
        eyebrow="Email verification"
        title="Enter your code."
        body={`We sent a six-digit code to ${email}.`}
        meta="Expires in five minutes"
      />

      <Card>
        <Controller
          control={control}
          name="otp"
          render={({ field: { onBlur, onChange, value } }) => (
            <OtpCodeInput
              value={value}
              onBlur={onBlur}
              onChange={onChange}
            />
          )}
        />
        <Button
          label="Verify email"
          loading={isSubmitting}
          disabled={!isValid}
          onPress={() => void handleSubmit(submit)()}
        />
      </Card>

      <Button
        label={secondsRemaining > 0 ? `Request another code in ${secondsRemaining}s` : 'Request another code'}
        variant="outline"
        loading={isResending}
        disabled={isCoolingDown}
        onPress={() => void resend()}
      />
      <Link href="/sign-in" asChild>
        <Button label="Back to sign in" variant="ghost" />
      </Link>
    </Screen>
  );
}

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
