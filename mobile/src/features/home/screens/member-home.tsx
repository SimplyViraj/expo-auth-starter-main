import { Link } from 'expo-router';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeroPanel } from '@/components/ui/hero-panel';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { useAuth } from '@/providers/auth-provider';

export default function MemberHomeScreen() {
  const { user } = useAuth();

  return (
    <Screen hasHeader>
      <HeroPanel
        eyebrow="AAyuva"
        title={`Hello, ${user?.name?.trim().split(/\s+/)[0] || 'there'}`}
        body="Your space for care, appointments, and everyday wellbeing."
      />
      <Card>
        <ListRow icon="calendar" title="Your care, in one place" body="Appointment booking and visit details are coming soon." />
        <Link href="/appointments" asChild>
          <Button label="View appointments" variant="secondary" icon="arrowRight" iconPosition="right" />
        </Link>
      </Card>
      <Card>
        <ListRow icon="wellness" title="Make time for wellbeing" body="Your wellness space is taking shape." />
        <Link href="/wellness" asChild>
          <Button label="Explore wellness" variant="outline" icon="arrowRight" iconPosition="right" />
        </Link>
      </Card>
      <Card>
        <AppText variant="subtitle">Make yourself at home</AppText>
        <AppText tone="muted">View your account details and keep your AAyuva profile up to date.</AppText>
        <Link href="/profile" asChild>
          <Button label="View profile" variant="outline" icon="person" />
        </Link>
      </Card>
    </Screen>
  );
}
