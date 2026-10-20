import { EmptyState } from '@/components/feedback/empty-state';
import { HeroPanel } from '@/components/ui/hero-panel';
import { Screen } from '@/components/ui/screen';

export default function AppointmentsScreen() {
  return (
    <Screen hasHeader>
      <HeroPanel eyebrow="AAyuva care" title="Appointments" body="A simpler way to plan your next visit." />
      <EmptyState title="Appointments are coming soon" body="You will be able to book visits and find your upcoming and past appointments here." />
    </Screen>
  );
}
