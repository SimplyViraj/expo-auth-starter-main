import { router } from 'expo-router';
import { HeroPanel } from '@/components/ui/hero-panel';
import { Screen } from '@/components/ui/screen';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PhoneCodeForm } from '@/features/auth/components/phone-code-form';
import { useAuth } from '@/providers/auth-provider';
export default function VerifyPhoneScreen() {
  const { user, refreshSession } = useAuth();
  const verified = !!user?.phoneNumber && user.phoneNumberVerified;
  return <Screen>
    <HeroPanel title={verified ? 'Mobile number verified' : 'Verify your mobile number'} body={verified ? user.phoneNumber! : 'Verify a number you own to finish setup. You can also use it to sign in.'} />
    {!verified ? <Card><PhoneCodeForm purpose="verify" initialPhone={user?.phoneNumber ?? ''} onVerified={refreshSession} /></Card> : null}
    <Button label="Continue setup" variant={verified ? 'primary' : 'ghost'} onPress={() => router.replace('/profile')} />
  </Screen>;
}
