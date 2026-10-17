import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { HeroPanel } from '@/components/ui/hero-panel';
import { Screen } from '@/components/ui/screen';
import { useAuth } from '@/features/auth/auth-provider';
import { useBiometricLock } from '@/features/biometrics/biometric-lock-provider';
import { useAppTheme } from '@/theme/theme-provider';

export function BiometricGate() {
  const { isSigningOut, phase, signOut } = useAuth();
  const {
    availability,
    isAppActive,
    isAuthenticating,
    isEnabled,
    isLocked,
    isReady,
    message,
    unlock,
  } = useBiometricLock();
  const { colors } = useAppTheme();
  const hasPromptedForCurrentLock = useRef(false);
  const shouldCoverApp = phase === 'ready' && isReady && isEnabled && isLocked;

  useEffect(() => {
    if (!shouldCoverApp) {
      hasPromptedForCurrentLock.current = false;
      return;
    }

    if (isAppActive && !hasPromptedForCurrentLock.current) {
      hasPromptedForCurrentLock.current = true;
      void unlock();
    }
  }, [isAppActive, shouldCoverApp, unlock]);

  if (!shouldCoverApp) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 1000, backgroundColor: colors.background }]}>
      <Screen
        scroll={false}
        contentStyle={{ alignItems: 'stretch', justifyContent: 'center' }}
      >
        <HeroPanel
          eyebrow="App locked"
          title="Welcome back"
          body={`Use ${availability?.label ?? 'your device biometrics'} to continue.`}
        />
        {message ? <AppText tone="muted">{message}</AppText> : null}
        <Button
          label={isAuthenticating ? 'Checking…' : 'Unlock app'}
          loading={isAuthenticating}
          onPress={() => void unlock()}
        />
        <Button
          label="Sign out instead"
          variant="ghost"
          loading={isSigningOut}
          onPress={() => void signOut()}
        />
      </Screen>
    </View>
  );
}
