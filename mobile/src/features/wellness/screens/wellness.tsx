import { Link } from 'expo-router';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeroPanel } from '@/components/ui/hero-panel';
import { Screen } from '@/components/ui/screen';

export default function WellnessScreen() {
  return (
    <Screen hasHeader>
      <HeroPanel eyebrow="AAyuva wellbeing" title="Wellness" body="Small steps toward feeling your best." />
      <Card>
        <AppText variant="subtitle">Find your wellness program</AppText>
        <AppText>Explore ten programs with 60-minute session protocols. Choose Starter, Core or Elite for your monthly pace.</AppText>
        <Link href="/memberships" asChild><Button label="Explore memberships and programs" /></Link>
      </Card>
    </Screen>
  );
}
