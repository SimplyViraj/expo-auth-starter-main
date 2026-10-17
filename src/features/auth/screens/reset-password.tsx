import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Keyboard } from 'react-native';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { HeroPanel } from '@/components/ui/hero-panel';
import { Screen } from '@/components/ui/screen';
import { getResetPasswordErrorMessage } from '@/features/auth/auth-errors';
import { NewPasswordStep } from '@/features/auth/components/new-password-step';
import { ResetCodeStep } from '@/features/auth/components/reset-code-step';
import { useOtpCooldown } from '@/features/auth/hooks/use-otp-cooldown';
import { resetPasswordSchema, type ResetPasswordValues } from '@/features/auth/validation/auth-schemas';
import { authClient } from '@/lib/auth/auth-client';
import { appToast } from '@/lib/toast/app-toast';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const email = getStringParam(params.email)?.trim().toLowerCase() ?? '';
  const { isCoolingDown, restart: restartCooldown, secondsRemaining } = useOtpCooldown();
  const [isResending, setIsResending] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [verifiedOtp, setVerifiedOtp] = useState<string | null>(null);
  const {
    control,
    getValues,
    handleSubmit,
    resetField,
    trigger,
    formState: { isSubmitting, isValid },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { otp: '', password: '', confirmPassword: '' },
    mode: 'onChange',
  });
  const otp = useWatch({ control, name: 'otp' });
  const isCodeComplete = /^\d{6}$/.test(otp.trim());

  async function verifyCode() {
    if (!email) return;

    const isOtpValid = await trigger('otp');
    if (!isOtpValid) return;

    setIsVerifyingCode(true);

    try {
      const submittedOtp = getValues('otp').trim();
      const result = await authClient.emailOtp.checkVerificationOtp({
        email,
        otp: submittedOtp,
        type: 'forget-password',
      });

      if (result.error) {
        appToast.error('Code not verified', { description: getResetPasswordErrorMessage(result.error) });
        return;
      }

      Keyboard.dismiss();
      setVerifiedOtp(submittedOtp);
    } catch {
      appToast.error('Code not verified', {
        description: 'Check your connection and try again.',
      });
    } finally {
      setIsVerifyingCode(false);
    }
  }

  async function updatePassword(values: ResetPasswordValues) {
    if (!email || !verifiedOtp) return;

    try {
      const result = await authClient.emailOtp.resetPassword({
        email,
        otp: verifiedOtp,
        password: values.password,
      });

      if (result.error) {
        setVerifiedOtp(null);
        appToast.error('Password reset failed', { description: getResetPasswordErrorMessage(result.error) });
        return;
      }

      appToast.success('Password updated', { description: 'Sign in with your new password.' });
      router.replace('/sign-in');
    } catch {
      appToast.error('Password reset failed', {
        description: 'Check your connection and try again.',
      });
    }
  }

  async function resend() {
    if (!email || isCoolingDown) return;

    setIsResending(true);

    try {
      const result = await authClient.emailOtp.requestPasswordReset({ email });

      if (result.error) {
        appToast.error('Code request failed', {
          description: 'We cannot send a reset code right now. Please try again.',
        });
        return;
      }

      resetField('otp');
      restartCooldown();
      appToast.success('Reset code requested', {
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
          eyebrow="Password recovery"
          title="Request a reset code."
          body="Enter your account email first so we can send a secure password-reset code."
        />
        <Link href="/forgot-password" asChild>
          <Button label="Request a reset code" />
        </Link>
        <Link href="/sign-in" asChild>
          <Button label="Back to sign in" variant="ghost" />
        </Link>
      </Screen>
    );
  }

  if (!verifiedOtp) {
    return (
      <ResetCodeStep
        control={control}
        email={email}
        isCodeComplete={isCodeComplete}
        isResending={isResending}
        isVerifying={isVerifyingCode}
        resendSeconds={secondsRemaining}
        onResend={() => void resend()}
        onVerify={() => void verifyCode()}
      />
    );
  }

  return (
    <NewPasswordStep
      control={control}
      isSubmitting={isSubmitting}
      isValid={isValid}
      onSubmit={() => void handleSubmit(updatePassword)()}
    />
  );
}

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
