import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { useAuth } from '@/features/auth/auth-provider';
import { useAppTheme, type ThemeMode } from '@/theme/theme-provider';

const appearanceOptions: { label: string; value: ThemeMode }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

export default function SettingsScreen() {
  const { user } = useAuth();
  const { colors, mode, motion, setMode, spacing } = useAppTheme();

  return (
    <Screen hasHeader>
      <Card>
        <AppText variant="eyebrow">Account</AppText>
        <AppText variant="subtitle">{user?.name}</AppText>
        <AppText tone="muted">{user?.email}</AppText>
      </Card>

      <Card>
        <AppText variant="subtitle">Appearance</AppText>
        <AppText tone="muted">Choose how the app looks on this device.</AppText>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: spacing.sm }}>
          {appearanceOptions.map((option) => {
            const selected = mode === option.value;

            return (
              <Button
                key={option.value}
                label={option.label}
                variant={selected ? 'primary' : 'outline'}
                size="md"
                fullWidth={false}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={{ flex: 1 }}
                onPress={() => setMode(option.value)}
              />
            );
          })}
        </View>
      </Card>

      <Link href="/biometric-lock" asChild>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => ({ opacity: pressed ? motion.opacity.pressed : 1 })}>
          <Card style={{ paddingHorizontal: spacing.xl, paddingVertical: spacing.xl }}>
            <ListRow
              icon="lock"
              title="App lock"
              body="Require Face ID, Touch ID, or biometrics when you return."
              trailing={<Icon name="chevronRight" size={18} color={colors.textMuted} />}
            />
          </Card>
        </Pressable>
      </Link>

      <Link href="/delete-account" asChild>
        <Button label="Delete account" variant="ghost" />
      </Link>

      <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
        <AppText variant="caption" tone="muted">
          Built by <AppText variant="caption" style={{ fontWeight: '900' }}>Code with Nomi</AppText>
        </AppText>
      </View>
    </Screen>
  );
}
