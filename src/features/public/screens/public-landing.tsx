import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeroPanel } from '@/components/ui/hero-panel';
import { Screen } from '@/components/ui/screen';
import { usePublicDemo } from '@/features/public/hooks/use-public-demo';
import type { PublicDemoResponse } from '@/types/demo-api';

export default function PublicLandingScreen() {
  const publicDemo = usePublicDemo();
  const [hasRequestedPublicData, setHasRequestedPublicData] = useState(false);
  const [publicResponse, setPublicResponse] = useState<PublicDemoResponse | null>(null);

  async function fetchPublicData() {
    setHasRequestedPublicData(true);
    const result = await publicDemo.refetch();

    if (result.data && !result.error) {
      setPublicResponse(result.data);
    }
  }

  return (
    <Screen hasHeader>
      <HeroPanel
        eyebrow="Daily inspiration"
        title="One useful idea for today"
        body="A small reminder available to everyone, with or without an account."
        meta="No account required"
      />

      <Card>
        <AppText variant="eyebrow">Public API demo</AppText>

        {!publicResponse && !(hasRequestedPublicData && publicDemo.error && !publicDemo.isFetching) ? (
          <AppText tone="muted">
            This endpoint returns public data without requiring a signed-in session. Tap the button to request it.
          </AppText>
        ) : null}

        {hasRequestedPublicData && !publicResponse && !publicDemo.isFetching && publicDemo.error ? (
          <Alert title="Public data is unavailable" body="Check your connection and try again." tone="warning" />
        ) : null}

        {publicResponse ? (
          <>
            <AppText variant="subtitle">{publicResponse.tip.title}</AppText>
            <AppText tone="muted">{publicResponse.tip.body}</AppText>
          </>
        ) : null}

        <Button
          label="Fetch public data"
          icon="refresh"
          variant="secondary"
          size="md"
          loading={publicDemo.isFetching}
          onPress={() => void fetchPublicData()}
        />
      </Card>
    </Screen>
  );
}
