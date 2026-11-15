import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image, ImageBackground, Pressable, View } from "react-native";
import { Controller, useForm } from "react-hook-form";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import {
  getSignInErrorMessage,
  isEmailNotVerifiedError,
} from "@/features/auth/utils/auth-errors";
import { useAuth } from "@/providers/auth-provider";
import { AuthFormHeader } from "@/features/auth/components/auth-form-header";
import { SocialAuthButtons } from "@/features/auth/components/social-auth-buttons";
import {
  signInSchema,
  type SignInValues,
} from "@/features/auth/schemas/auth-schemas";
import { authClient } from "@/features/auth/services/auth-client";
import { appToast } from "@/components/feedback/app-toast";
import { useAppTheme } from "@/theme/theme-provider";

export default function SignInScreen() {
  const { refreshSession } = useAuth();
  const { colors, spacing } = useAppTheme();
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
      scroll
      contentStyle={{
        width: "100%",
        maxWidth: 480,
        alignSelf: "center",
        gap: 0,
        padding: 0,
        paddingTop: 0,
        paddingBottom: 0,
      }}
    >
      <StatusBar style="light" />
      <ImageBackground
        source={require('../../../../assets/images/aayuvya background.png')}
        resizeMode="cover"
        style={{ height: 286, justifyContent: 'center', alignItems: 'center' }}
      >
        <Image
          source={require('../../../../assets/images/logo-white.png')}
          accessibilityLabel="Aayuvya · Prevent, Perform, Prevail"
          resizeMode="contain"
          style={{ width: 156, height: 64 }}
        />
      </ImageBackground>
      <View
        style={{
          gap: spacing.lg,
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.xl,
          paddingBottom: spacing.xxl,
          marginTop: -24,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          backgroundColor: colors.background,
        }}
      >
        <AuthFormHeader
          title="Welcome back"
          body="Your preventive care, all in one place. Sign in to continue."
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

        <Button label="Sign in with mobile number" variant="outline" disabled={isSubmitting} onPress={() => router.push('/phone-sign-in')} />
        <SocialAuthButtons />

        <Link href="/register" asChild>
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
