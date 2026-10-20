import { EmptyState } from '@/components/feedback/empty-state';
import { HeroPanel } from '@/components/ui/hero-panel';
import { Screen } from '@/components/ui/screen';

export default function WellnessScreen() {
  return (
    <Screen hasHeader>
      <HeroPanel eyebrow="AAyuva wellbeing" title="Wellness" body="Small steps toward feeling your best." />
      <EmptyState title="Your wellness space is coming soon" body="Wellness resources and activities will be available here as AAyuva grows." />
    </Screen>
  );
}
