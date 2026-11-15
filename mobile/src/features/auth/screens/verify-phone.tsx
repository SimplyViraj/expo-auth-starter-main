import { Redirect } from 'expo-router';
import { HeroPanel } from '@/components/ui/hero-panel';
import { Screen } from '@/components/ui/screen';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PhoneCodeForm } from '@/features/auth/components/phone-code-form';
import { useAuth } from '@/providers/auth-provider';
export default function VerifyPhoneScreen() {
  const { isSigningOut, refreshSession, signOut, user } = useAuth();
  const verified = !!user?.phoneNumber && user.phoneNumberVerified;
  if (verified) return <Redirect href="/complete-profile" />;

  return (
    <Screen>
      <Button
        label="Go back"
        variant="ghost"
        icon="arrowLeft"
        fullWidth={false}
        loading={isSigningOut}
        onPress={() => void signOut()}
      />
      <HeroPanel
        title="Verify your mobile number"
        body="Verify a number you own to finish setup. You can also use it to sign in."
      />
      <Card>
        <PhoneCodeForm
          purpose="verify"
          initialPhone={user?.phoneNumber ?? ''}
          onVerified={refreshSession}
        />
      </Card>
    </Screen>
  );
}
