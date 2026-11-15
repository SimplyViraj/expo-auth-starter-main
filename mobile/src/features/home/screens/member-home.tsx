import { Link } from 'expo-router';
import { Image, Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { useAuth } from '@/providers/auth-provider';
import { useAppTheme } from '@/theme/theme-provider';

export default function MemberHomeScreen() {
  const { user } = useAuth();
  const { colors, radius, spacing, resolvedTheme } = useAppTheme();
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'there';
  const logo = resolvedTheme === 'dark'
    ? require('../../../../assets/images/logo-white.png')
    : require('../../../../assets/images/logo-dark.png');
  const heroText = resolvedTheme === 'dark' ? '#111C2E' : '#F6F2EA';
  const heroMuted = resolvedTheme === 'dark' ? '#25374F' : '#C7CFDB';

  return (
    <Screen hasHeader>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Image
          source={logo}
          accessibilityLabel="Aayuvya"
          resizeMode="contain"
          style={{ width: 118, height: 42 }}
        />
        <Link href="/profile" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="person" size={19} color={colors.primary} />
          </Pressable>
        </Link>
      </View>

      <View style={{ gap: spacing.xs }}>
        <AppText variant="caption" tone="muted">Good morning, {firstName}</AppText>
        <AppText variant="title" style={{ fontSize: 26, lineHeight: 32 }}>A calmer you is a daily decision.</AppText>
      </View>

      <Card style={{ padding: spacing.sm, backgroundColor: colors.primary, borderColor: colors.primary }}>
        <View style={{ backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, overflow: 'hidden' }}>
          <AppText variant="eyebrow" style={{ color: heroMuted }}>Your wellbeing</AppText>
          <AppText variant="subtitle" style={{ color: heroText, fontSize: 20 }}>Care that moves with you.</AppText>
          <AppText tone="muted" style={{ color: heroMuted }}>Explore a plan shaped around your health goals and the people you care for.</AppText>
          <Link href="/memberships" asChild>
            <Button label="Explore memberships" icon="arrowRight" iconPosition="right" variant="outline" style={{ backgroundColor: colors.surface, borderColor: colors.surface }} />
          </Link>
        </View>
      </Card>

      <Card>
        <ListRow icon="calendar" title="Your care, in one place" body="Appointment booking and visit details are coming soon." />
        <Link href="/appointments" asChild>
          <Button label="View appointments" variant="outline" icon="arrowRight" iconPosition="right" />
        </Link>
      </Card>

      <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <AppText variant="subtitle">A little every day</AppText>
          <AppText tone="muted">Build simple habits for your wellbeing.</AppText>
        </View>
        <Link href="/wellness" asChild>
          <Button label="Wellness" variant="secondary" fullWidth={false} />
        </Link>
      </Card>
    </Screen>
  );
}
