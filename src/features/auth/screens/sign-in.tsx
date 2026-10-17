import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { Pressable, View } from "react-native";
import { Controller, useForm } from "react-hook-form";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import {
  getSignInErrorMessage,
  isEmailNotVerifiedError,
} from "@/features/auth/auth-errors";
import { useAuth } from "@/features/auth/auth-provider";
import { AuthFormHeader } from "@/features/auth/components/auth-form-header";
import { SocialAuthButtons } from "@/features/auth/components/social-auth-buttons";
import {
  signInSchema,
  type SignInValues,
} from "@/features/auth/validation/auth-schemas";
import { authClient } from "@/lib/auth/auth-client";
import { appToast } from "@/lib/toast/app-toast";
import { useAppTheme } from "@/theme/theme-provider";

export default function SignInScreen() {
  const { refreshSession } = useAuth();
  const { spacing } = useAppTheme();
  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isValid },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
    mode: "onChange",
  });

  async function submit(values: SignInValues) {
    try {
      const result = await authClient.signIn.email({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });

      if (result.error) {
        if (isEmailNotVerifiedError(result.error)) {
          router.replace({
            pathname: "/verify-email",
            params: { email: values.email.trim().toLowerCase() },
          });
          return;
        }

        appToast.error("Sign-in failed", {
          description: getSignInErrorMessage(result.error),
        });
        return;
      }

      await refreshSession();
    } catch {
      appToast.error("Sign-in failed", {
        description: "Check your connection and try again.",
      });
    }
  }

  return (
    <Screen
      scroll={false}
      contentStyle={{
        justifyContent: "center",
        width: "100%",
        maxWidth: 480,
        alignSelf: "center",
        gap: spacing.md,
        paddingHorizontal: 0,
      }}
    >
      <View
        style={{
          gap: spacing.lg,
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.xl,
        }}
      >
        <AuthFormHeader
          title="Welcome back"
          body="Sign in with your email and password."
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
              autoComplete="current-password"
              secureTextEntry
              size="md"
            />
          )}
        />
        <Link href="/forgot-password" asChild>
          <Pressable
            accessibilityRole="button"
            style={{
              alignSelf: "flex-end",
              paddingHorizontal: spacing.xs,
              paddingVertical: spacing.xs,
            }}
          >
            <AppText variant="caption" tone="primary">
              Forgot password?
            </AppText>
          </Pressable>
        </Link>
        <Button
          label="Sign in"
          loading={isSubmitting}
          disabled={!isValid}
          size="md"
          onPress={() => void handleSubmit(submit)()}
        />

        <SocialAuthButtons />

        <Link href="/sign-up" asChild>
          <Pressable
            accessibilityRole="button"
            style={{ alignSelf: "center", padding: spacing.xs }}
          >
            <AppText variant="caption" tone="muted">
              New here?{" "}
              <AppText variant="caption" tone="primary">
                Create an account
              </AppText>
            </AppText>
          </Pressable>
        </Link>
      </View>

      <Link href="/public" asChild>
        <Pressable
          accessibilityRole="button"
          style={{
            alignSelf: "center",
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
          }}
        >
          <AppText variant="caption" tone="muted">
            Continue without signing in
          </AppText>
        </Pressable>
      </Link>
    </Screen>
  );
}
