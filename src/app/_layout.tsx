import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppToaster } from '@/components/ui/app-toaster';
import { Button } from '@/components/ui/button';
import { HeroPanel } from '@/components/ui/hero-panel';
import { Screen } from '@/components/ui/screen';
import { useAuth } from '@/features/auth/auth-provider';
import { BiometricGate } from '@/features/biometrics/components/biometric-gate';
import { useBiometricLock } from '@/features/biometrics/biometric-lock-provider';
import { AppProviders } from '@/providers/app-providers';
import { useAppTheme } from '@/theme/theme-provider';

if (Platform.OS !== 'web') {
  void SplashScreen.preventAutoHideAsync().catch(() => {
    // Fast Refresh can preserve an already-managed native splash screen.
  });
}

function RootNavigator() {
  const { isInitialSessionUnavailable, isRefreshingSession, phase, refreshSession } = useAuth();
  const { isReady: isBiometricReady } = useBiometricLock();
  const { colors, isReady: isThemeReady, resolvedTheme } = useAppTheme();
  const isStarting =
    (phase === 'checking' && !isInitialSessionUnavailable) || !isBiometricReady || !isThemeReady;
  const initialRouteName = phase === 'signed-out' ? '(auth)' : '(main)';

  useEffect(() => {
    if (Platform.OS !== 'web' && !isStarting) {
      void SplashScreen.hideAsync();
    }
  }, [isStarting]);

  if (isStarting) {
    return null;
  }

  if (isInitialSessionUnavailable) {
    return (
      <>
        <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
        <Screen scroll={false} contentStyle={{ justifyContent: 'center' }}>
          <HeroPanel
            eyebrow="Connection needed"
            title="We couldn’t open your account"
            body="Check your internet connection, then try again. Your saved sign-in has not been removed."
          />
          <Button
            label="Try again"
            loading={isRefreshingSession}
            onPress={() => void refreshSession()}
          />
        </Screen>
      </>
    );
  }

  return (
    <>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        initialRouteName={initialRouteName}
        screenOptions={{
          animation: 'none',
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(public)" />

        <Stack.Protected guard={phase === 'signed-out'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={phase === 'needs-onboarding' || phase === 'ready'}>
          <Stack.Screen name="(main)" />
        </Stack.Protected>
      </Stack>
      <BiometricGate />
    </>
  );
}

function ThemedAppRoot() {
  const { colors } = useAppTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <RootNavigator />
      <AppToaster />
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <ThemedAppRoot />
    </AppProviders>
  );
}
