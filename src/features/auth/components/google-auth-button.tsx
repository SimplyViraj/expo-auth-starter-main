import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { isGoogleAuthConfigured } from '@/config/env';
import { useAuth } from '@/features/auth/auth-provider';
import { GoogleLogo } from '@/features/auth/components/google-logo';
import { signInWithGoogle } from '@/lib/auth/google-sign-in';
import { appToast } from '@/lib/toast/app-toast';
import { useAppTheme } from '@/theme/theme-provider';

export function GoogleAuthButton({ compact = false, style }: { compact?: boolean; style?: StyleProp<ViewStyle> }) {
  const { refreshSession } = useAuth();
  const { colors, motion, radius, spacing } = useAppTheme();
  const [loading, setLoading] = useState(false);

  if (Platform.OS === 'web' || !isGoogleAuthConfigured) return null;

  async function handlePress() {
    setLoading(true);

    try {
      const outcome = await signInWithGoogle();
      if (outcome === 'cancelled') return;

      await refreshSession();
    } catch (error) {
      appToast.error('Could not continue with Google', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Pressable
      accessibilityLabel="Continue with Google"
      accessibilityRole="button"
      disabled={loading}
      onPress={() => void handlePress()}
      style={({ pressed }) => [
        {
          minHeight: 48,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.pill,
          backgroundColor: colors.surface,
          opacity: loading ? 0.56 : pressed ? motion.opacity.pressed : 1,
        },
        style,
      ]}>
      {loading ? <ActivityIndicator color={colors.primary} /> : <GoogleLogo />}
      {!compact && !loading ? <AppText style={{ fontWeight: '800' }}>Continue with Google</AppText> : null}
    </Pressable>
  );
}
