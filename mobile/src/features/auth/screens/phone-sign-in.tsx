import { router } from 'expo-router';
import { HeroPanel } from '@/components/ui/hero-panel';
import { Screen } from '@/components/ui/screen';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PhoneCodeForm } from '@/features/auth/components/phone-code-form';
import { useAuth } from '@/providers/auth-provider';
export default function PhoneSignInScreen() {
  const { refreshSession } = useAuth();
  return <Screen>
    <HeroPanel title="Sign in with your mobile" body="Use the number you verified during account setup." />
    <Card><PhoneCodeForm purpose="sign-in" onVerified={refreshSession} /></Card>
    <Button label="Sign in with email" variant="ghost" onPress={() => router.replace('/sign-in')} />
  </Screen>;
}
