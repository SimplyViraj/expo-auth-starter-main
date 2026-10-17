import { Redirect } from 'expo-router';

import { useAuth } from '@/features/auth/auth-provider';

export default function EntryPage() {
  const { phase } = useAuth();

  if (phase === 'checking') return null;

  const destination =
    phase === 'signed-out' ? '/sign-in' : phase === 'needs-onboarding' ? '/profile' : '/dashboard';

  return <Redirect href={destination} />;
}
