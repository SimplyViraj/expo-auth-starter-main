import { Link } from 'expo-router';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';

export default function NotFoundPage() {
  return (
    <Screen contentStyle={{ justifyContent: 'center' }}>
      <EmptyState
        title="Page not found"
        body="We couldn’t find the page you were looking for."
      />
      <Link href="/" asChild>
        <Button label="Go home" />
      </Link>
    </Screen>
  );
}
