import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeroPanel } from '@/components/ui/hero-panel';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/features/auth/validation/auth-schemas';
import { authClient } from '@/lib/auth/auth-client';
import { appToast } from '@/lib/toast/app-toast';

export default function ForgotPasswordScreen() {
  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isValid },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
    mode: 'onChange',
  });
  async function submit(values: ForgotPasswordValues) {
    const email = values.email.trim().toLowerCase();

    try {
      const result = await authClient.emailOtp.requestPasswordReset({ email });

      if (result.error) {
        appToast.error('Reset request failed', {
          description: 'We cannot send a reset code right now. Please try again.',
        });
        return;
      }

      router.replace({ pathname: '/reset-password', params: { email } });
    } catch {
      appToast.error('Reset request failed', {
        description: 'Check your connection and try again.',
      });
    }
  }

  return (
    <Screen>
      <HeroPanel
        eyebrow="Password recovery"
        title="Reset your password."
        body="Enter your email to request a six-digit reset code."
      />

      <Card>
        <Controller
          control={control}
          name="email"
          render={({ field: { onBlur, onChange, value }, fieldState }) => (
            <Input
              label="Email"
              value={value}
              error={fieldState.error?.message}
              onBlur={onBlur}
              onChangeText={onChange}
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
            />
          )}
        />
        <Button
          label="Send reset code"
          loading={isSubmitting}
          disabled={!isValid}
          onPress={() => void handleSubmit(submit)()}
        />
      </Card>

      <Link href="/sign-in" asChild>
        <Button label="Back to sign in" variant="ghost" />
      </Link>
    </Screen>
  );
}
