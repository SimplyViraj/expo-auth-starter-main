import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { useAppTheme } from '@/theme/theme-provider';

type AuthFormHeaderProps = {
  title: string;
  body: string;
};

export function AuthFormHeader({ title, body }: AuthFormHeaderProps) {
  const { spacing } = useAppTheme();

  return (
    <View style={{ gap: spacing.sm, alignItems: 'center' }}>
      <AppText accessibilityRole="header" variant="title" style={{ textAlign: 'center' }}>{title}</AppText>
      <AppText tone="muted" style={{ textAlign: 'center' }}>{body}</AppText>
    </View>
  );
}
