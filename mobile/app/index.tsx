import { Redirect } from 'expo-router';

import { useAuth } from '@/providers/auth-provider';

export default function EntryPage() {
  const { phase } = useAuth();

  if (phase === 'checking') return null;

  const destination =
    phase === 'signed-out' ? '/sign-in' : phase === 'needs-onboarding' ? '/complete-profile' : '/(app)/(tabs)';

  return <Redirect href={destination} />;
}
