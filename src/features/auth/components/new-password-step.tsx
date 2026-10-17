import type { Control } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeroPanel } from '@/components/ui/hero-panel';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { authPolicy } from '@/constants/auth-policy';
import type { ResetPasswordValues } from '@/features/auth/validation/auth-schemas';

type NewPasswordStepProps = {
  control: Control<ResetPasswordValues>;
  isSubmitting: boolean;
  isValid: boolean;
  onSubmit: () => void;
};

export function NewPasswordStep({
  control,
  isSubmitting,
  isValid,
  onSubmit,
}: NewPasswordStepProps) {
  return (
    <Screen>
      <HeroPanel
        eyebrow="Password recovery"
        title="Create a new password."
        body={`Your code was confirmed. Choose a password with at least ${authPolicy.minimumPasswordLength} characters.`}
      />

      <Card>
        <Controller
          control={control}
          name="password"
          render={({ field: { onBlur, onChange, value }, fieldState }) => (
            <Input
              label="New password"
              value={value}
              error={fieldState.error?.message}
              onBlur={onBlur}
              onChangeText={onChange}
              autoCapitalize="none"
              autoComplete="new-password"
              autoCorrect={false}
              spellCheck={false}
              secureTextEntry
            />
          )}
        />
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onBlur, onChange, value }, fieldState }) => (
            <Input
              label="Confirm new password"
              value={value}
              error={fieldState.error?.message}
              onBlur={onBlur}
              onChangeText={onChange}
              autoCapitalize="none"
              autoComplete="new-password"
              autoCorrect={false}
              spellCheck={false}
              secureTextEntry
            />
          )}
        />
        <Button
          label="Update password"
          loading={isSubmitting}
          disabled={!isValid}
          onPress={onSubmit}
        />
      </Card>
    </Screen>
  );
}
