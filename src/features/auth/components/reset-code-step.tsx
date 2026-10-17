import type { Control } from 'react-hook-form';
import { Link } from 'expo-router';
import { Controller } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeroPanel } from '@/components/ui/hero-panel';
import { Screen } from '@/components/ui/screen';
import { OtpCodeInput } from '@/features/auth/components/otp-code-input';
import type { ResetPasswordValues } from '@/features/auth/validation/auth-schemas';

type ResetCodeStepProps = {
  control: Control<ResetPasswordValues>;
  email: string;
  isCodeComplete: boolean;
  isResending: boolean;
  isVerifying: boolean;
  resendSeconds: number;
  onResend: () => void;
  onVerify: () => void;
};

export function ResetCodeStep({
  control,
  email,
  isCodeComplete,
  isResending,
  isVerifying,
  resendSeconds,
  onResend,
  onVerify,
}: ResetCodeStepProps) {
  return (
    <Screen>
      <HeroPanel
        eyebrow="Password recovery"
        title="Check your email."
        body={`Enter the six-digit reset code for ${email}.`}
      />

      <Card>
        <Controller
          control={control}
          name="otp"
          render={({ field: { onBlur, onChange, value } }) => (
            <OtpCodeInput value={value} onBlur={onBlur} onChange={onChange} />
          )}
        />
        <Button
          label="Verify code"
          loading={isVerifying}
          disabled={!isCodeComplete}
          onPress={onVerify}
        />
      </Card>
      <Button
        label={resendSeconds > 0 ? `Request another code in ${resendSeconds}s` : 'Request another code'}
        variant="ghost"
        loading={isResending}
        disabled={resendSeconds > 0}
        onPress={onResend}
      />
      <Link href="/forgot-password" asChild>
        <Button label="Use a different email" variant="ghost" />
      </Link>
    </Screen>
  );
}
