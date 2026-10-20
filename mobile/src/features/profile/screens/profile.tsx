import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Alert } from '@/components/feedback/alert';
import { LoadingIndicator } from '@/components/feedback/loading-indicator';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { ProfileForm } from '@/features/profile/components/profile-form';
import { useProfile } from '@/features/profile/hooks/use-profile';
import { useAuth } from '@/providers/auth-provider';
import { useAppTheme } from '@/theme/theme-provider';

export default function ProfileScreen() {
  const { isSigningOut, signOut, user } = useAuth();
  const { colors, radius, spacing } = useAppTheme();
  const profileQuery = useProfile();
  const { refetch } = profileQuery;
  const [isEditing, setIsEditing] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const profile = profileQuery.data?.user;

  useFocusEffect(useCallback(() => {
    void refetch({ cancelRefetch: false });
  }, [refetch]));

  return (
    <Screen hasHeader>
      {profileQuery.isPending ? <LoadingIndicator label="Loading your profile…" /> : null}

      {profileQuery.isError ? (
        <Card>
          <Alert
            title={profile ? 'Couldn’t refresh your profile' : 'Profile unavailable'}
            body={profile ? 'Showing your last saved details. Check your connection and try again.' : 'Check your connection and try again to load your account details.'}
            tone="warning"
          />
          <Button label="Try again" variant="outline" loading={profileQuery.isFetching} onPress={() => void refetch()} />
        </Card>
      ) : null}

      {profile ? (
        <>
          <Card style={{ alignItems: 'center', padding: spacing.xl }}>
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{ width: 72, height: 72, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <AppText variant="hero" tone="primary">{profile.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</AppText>
            </View>
            <AppText variant="title" style={{ textAlign: 'center' }}>{profile.name}</AppText>
            {profile.username ? <AppText tone="muted">@{profile.username}</AppText> : null}
            <AppText variant="caption" tone="primary">AAyuva member</AppText>
          </Card>

          {isEditing ? (
            <ProfileForm key={user?.id} profile={profile} onClose={() => setIsEditing(false)} />
          ) : (
            <Card>
              <AppText variant="subtitle">Personal details</AppText>
              <ListRow title="Full name" body={profile.name} icon="person" />
              <ListRow title="Username" body={profile.username ? `@${profile.username}` : 'Not set'} icon="edit" />
              <Button label="Edit profile" icon="edit" variant="outline" disabled={profileQuery.isError || isSigningOut} onPress={() => setIsEditing(true)} />
            </Card>
          )}

          <Card>
            <AppText variant="subtitle">Contact details</AppText>
            <ListRow title="Email" body={profile.email} icon="mail" />
            <AppText variant="caption" tone={profile.emailVerified ? 'primary' : 'muted'}>{profile.emailVerified ? 'Email verified' : 'Email not verified'}</AppText>
            <ListRow title="Mobile number" body={profile.phoneNumber ?? 'Not added'} icon="lock" />
            <AppText variant="caption" tone={profile.phoneNumberVerified ? 'primary' : 'muted'}>{profile.phoneNumberVerified ? 'Mobile number verified' : 'Mobile number not verified'}</AppText>
            <AppText variant="caption" tone="muted">Email and mobile number are managed through account verification.</AppText>
          </Card>
        </>
      ) : null}

      {!isEditing ? (
        <>
          <Link href="/settings" asChild>
            <Button label="Settings" icon="settings" variant="outline" disabled={isSigningOut} />
          </Link>
          {confirmingSignOut ? (
            <Card>
              <AppText variant="subtitle">Sign out of AAyuva?</AppText>
              <AppText tone="muted">You can sign back in at any time.</AppText>
              <Button label="Confirm sign out" variant="danger" loading={isSigningOut} onPress={() => void signOut()} />
              <Button label="Stay signed in" variant="ghost" disabled={isSigningOut} onPress={() => setConfirmingSignOut(false)} />
            </Card>
          ) : (
            <Button label="Sign out" icon="signOut" variant="ghost" loading={isSigningOut} onPress={() => setConfirmingSignOut(true)} />
          )}
        </>
      ) : null}
    </Screen>
  );
}
