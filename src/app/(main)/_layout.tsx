import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { Alert, View } from 'react-native';

import { HeaderIconButton } from '@/components/ui/header-icon-button';
import { useAuth } from '@/features/auth/auth-provider';
import { useAppTheme } from '@/theme/theme-provider';

export default function MainLayout() {
  const { isSigningOut, phase, signOut } = useAuth();
  const { colors, spacing } = useAppTheme();

  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/dashboard');
  }

  function confirmSignOut() {
    Alert.alert('Sign out?', 'You can sign back in at any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  const backButton = () => (
    <HeaderIconButton accessibilityLabel="Go back" icon="arrowLeft" onPress={goBack} />
  );

  return (
    <Stack
      initialRouteName={phase === 'needs-onboarding' ? '(onboarding)' : 'dashboard'}
      screenOptions={{
        headerShown: true,
        headerBackButtonDisplayMode: 'minimal',
        headerBackTitle: '',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={phase === 'needs-onboarding'}>
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={phase === 'ready'}>
        <Stack.Screen
          name="dashboard"
          options={{
            title: 'Home',
            gestureEnabled: false,
            headerLeft: () => null,
            headerRight: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <HeaderIconButton
                  accessibilityLabel="Open settings"
                  icon="settings"
                  onPress={() => router.push('/settings')}
                />
                <HeaderIconButton
                  accessibilityLabel="Sign out"
                  color={colors.danger}
                  disabled={isSigningOut}
                  icon="signOut"
                  onPress={confirmSignOut}
                />
              </View>
            ),
          }}
        />
        <Stack.Screen name="settings" options={{ title: 'Settings', headerLeft: backButton }} />
        <Stack.Screen name="delete-account" options={{ title: 'Delete account', headerLeft: backButton }} />
        <Stack.Screen name="biometric-lock" options={{ title: 'App lock', headerLeft: backButton }} />
      </Stack.Protected>
    </Stack>
  );
}
