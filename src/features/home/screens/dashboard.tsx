import { Link } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Alert } from '@/components/ui/alert';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeroPanel } from '@/components/ui/hero-panel';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { useAuth } from '@/features/auth/auth-provider';
import { useProtectedDemo } from '@/features/home/hooks/use-protected-demo';
import { useAppTheme } from '@/theme/theme-provider';
import type { ProtectedDemoResponse } from '@/types/demo-api';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { colors, radius, spacing } = useAppTheme();
  const protectedDemo = useProtectedDemo();
  const [hasRequestedProtectedData, setHasRequestedProtectedData] = useState(false);
  const [protectedResponse, setProtectedResponse] = useState<ProtectedDemoResponse | null>(null);

  async function fetchProtectedData() {
    setHasRequestedProtectedData(true);
    const result = await protectedDemo.refetch();

    if (result.data && !result.error) {
      setProtectedResponse(result.data);
    }
  }

  return (
    <Screen hasHeader>
      <HeroPanel
        eyebrow="Your day"
        title={`Hello, ${user?.name ?? 'there'}`}
        body="Everything important is ready when you are."
      />

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
          <AppText variant="eyebrow">Protected API demo</AppText>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              borderRadius: radius.pill,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              backgroundColor: colors.primarySoft,
            }}>
            <Icon name="lock" size={13} color={colors.primary} />
            <AppText variant="caption" tone="primary">Only visible to you</AppText>
          </View>
        </View>

        {!protectedResponse && !(hasRequestedProtectedData && protectedDemo.error && !protectedDemo.isFetching) ? (
          <AppText tone="muted">
            This endpoint returns private data only after the server validates your signed-in session. Tap the button to request it.
          </AppText>
        ) : null}

        {hasRequestedProtectedData && !protectedResponse && !protectedDemo.isFetching && protectedDemo.error ? (
          <Alert title="Protected data is unavailable" body="Check your connection and try again." tone="warning" />
        ) : null}

        {protectedResponse ? (
          <>
            <AppText variant="subtitle">{protectedResponse.workspace.title}</AppText>
            <AppText tone="muted">{protectedResponse.workspace.body}</AppText>
          </>
        ) : null}

        <Button
          label="Fetch protected data"
          icon="refresh"
          variant="secondary"
          size="md"
          loading={protectedDemo.isFetching}
          onPress={() => void fetchProtectedData()}
        />
      </Card>

      <Link href="/public" asChild>
        <Button label="View today’s public tip" variant="outline" />
      </Link>
    </Screen>
  );
}
