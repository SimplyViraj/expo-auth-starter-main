import { Platform, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { isGoogleAuthConfigured } from '@/config/env';
import { AppleAuthButton } from '@/features/auth/components/apple-auth-button';
import { GoogleAuthButton } from '@/features/auth/components/google-auth-button';
import { useAppTheme } from '@/theme/theme-provider';

export function SocialAuthButtons() {
  const { colors, spacing } = useAppTheme();
  const showApple = Platform.OS === 'ios';
  const showGoogle = Platform.OS !== 'web' && isGoogleAuthConfigured;

  if (!showApple && !showGoogle) return null;

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ height: 1, flex: 1, backgroundColor: colors.border }} />
        <AppText variant="caption" tone="muted">Or continue with</AppText>
        <View style={{ height: 1, flex: 1, backgroundColor: colors.border }} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        {showGoogle ? <GoogleAuthButton compact={showApple} style={{ flex: 1 }} /> : null}
        {showApple ? <AppleAuthButton style={{ flex: 1 }} /> : null}
      </View>
    </View>
  );
}
