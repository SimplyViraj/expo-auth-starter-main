import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { authPolicy } from '@/constants/auth-policy';
import { getSignUpErrorMessage } from '@/features/auth/auth-errors';
import { AuthFormHeader } from '@/features/auth/components/auth-form-header';
import { SocialAuthButtons } from '@/features/auth/components/social-auth-buttons';
import { signUpSchema, type SignUpValues } from '@/features/auth/validation/auth-schemas';
import { authClient } from '@/lib/auth/auth-client';
import { appToast } from '@/lib/toast/app-toast';
import { useAppTheme } from '@/theme/theme-provider';

export default function SignUpScreen() {
  const { spacing } = useAppTheme();
  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isValid },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
    mode: 'onChange',
  });

  async function submit(values: SignUpValues) {
    const email = values.email.trim().toLowerCase();

    try {
      const result = await authClient.signUp.email({
        name: values.name.trim(),
        email,
        password: values.password,
      });

      if (result.error) {
        appToast.error('Account creation failed', { description: getSignUpErrorMessage(result.error) });
        return;
      }

      router.replace({ pathname: '/verify-email', params: { email } });
    } catch {
      appToast.error('Account creation failed', {
        description: 'Check your connection and try again.',
      });
    }
  }

  return (
    <Screen
      scroll={false}
      contentStyle={{ justifyContent: 'center', width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 0 }}>
      <View style={{ gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.xl }}>
        <AuthFormHeader
          title="Create your account"
          body={`Use a password with at least ${authPolicy.minimumPasswordLength} characters.`}
        />

        <Controller
          control={control}
          name="name"
          render={({ field: { onBlur, onChange, value }, fieldState }) => (
            <Input
              accessibilityLabel="Name"
              placeholder="Name"
              leftIcon="person"
              variant="filled"
              value={value}
              error={fieldState.error?.message}
              onBlur={onBlur}
              onChangeText={onChange}
              autoComplete="name"
              size="md"
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field: { onBlur, onChange, value }, fieldState }) => (
            <Input
              accessibilityLabel="Email"
              placeholder="Email"
              leftIcon="mail"
              variant="filled"
              value={value}
              error={fieldState.error?.message}
              onBlur={onBlur}
              onChangeText={onChange}
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              size="md"
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { onBlur, onChange, value }, fieldState }) => (
            <Input
              accessibilityLabel="Password"
              placeholder="Password"
              leftIcon="lock"
              variant="filled"
              value={value}
              error={fieldState.error?.message}
              onBlur={onBlur}
              onChangeText={onChange}
              autoComplete="new-password"
              secureTextEntry
              size="md"
            />
          )}
        />
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onBlur, onChange, value }, fieldState }) => (
            <Input
              accessibilityLabel="Confirm password"
              placeholder="Confirm password"
              leftIcon="lock"
              variant="filled"
              value={value}
              error={fieldState.error?.message}
              onBlur={onBlur}
              onChangeText={onChange}
              autoComplete="new-password"
              secureTextEntry
              size="md"
            />
          )}
        />
        <Button
          label="Create account"
          loading={isSubmitting}
          disabled={!isValid}
          size="md"
          onPress={() => void handleSubmit(submit)()}
        />

        <SocialAuthButtons />

        <Link href="/sign-in" asChild>
          <Pressable accessibilityRole="button" style={{ alignSelf: 'center', padding: spacing.xs }}>
            <AppText variant="caption" tone="muted">
              Already have an account? <AppText variant="caption" tone="primary">Sign in</AppText>
            </AppText>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}
