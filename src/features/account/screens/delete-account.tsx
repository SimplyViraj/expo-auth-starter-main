import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { Screen } from '@/components/ui/screen';
import { useUserAccounts } from '@/features/account/hooks/use-user-accounts';
import { useAuth } from '@/features/auth/auth-provider';
import { removeBiometricPreference } from '@/features/biometrics/biometric-preference';
import { authClient } from '@/lib/auth/auth-client';
import { appToast } from '@/lib/toast/app-toast';

type DeleteAccountError = {
  code?: string;
  status?: number;
};

export default function DeleteAccountScreen() {
  const queryClient = useQueryClient();
  const accounts = useUserAccounts();
  const { refreshSession, user } = useAuth();
  const [confirmation, setConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const hasPassword = accounts.data?.some((account) => account.providerId === 'credential') ?? false;
  const canDelete =
    confirmation === 'DELETE' && !accounts.isPending && !accounts.error && (!hasPassword || password.length > 0);

  async function deleteAccount() {
    if (!canDelete || !user) return;

    setIsDeleting(true);

    try {
      const result = await authClient.deleteUser(hasPassword ? { password } : {});

      if (result.error) {
        appToast.error('Account not deleted', {
          description: getDeleteAccountErrorMessage(result.error),
        });
        return;
      }

      await removeBiometricPreference(user.id).catch(() => {
        // The server account is already deleted; stale device-only state is safe to ignore.
      });
      queryClient.clear();
      await refreshSession();
      appToast.success('Account deleted');
    } catch {
      appToast.error('Account not deleted', {
        description: 'Check your connection and try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Screen hasHeader>
      <AppText tone="muted">Permanently remove this account and its authentication data.</AppText>

      <Alert
        tone="danger"
        title="This cannot be undone"
        body="Your account, linked sign-in methods, and active sessions will be permanently removed."
      />

      {accounts.isPending ? <LoadingIndicator label="Checking your sign-in methods…" /> : null}

      {accounts.error ? (
        <Card>
          <AppText variant="subtitle">Sign-in methods unavailable</AppText>
          <AppText tone="muted">We need to confirm how you sign in before deleting your account.</AppText>
          <Button label="Try again" variant="outline" onPress={() => void accounts.refetch()} />
        </Card>
      ) : null}

      {accounts.data ? (
        <Card>
          <Input
            label="Type DELETE to confirm"
            value={confirmation}
            onChangeText={setConfirmation}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          {hasPassword ? (
            <Input
              label="Current password"
              value={password}
              onChangeText={setPassword}
              autoComplete="current-password"
              secureTextEntry
            />
          ) : (
            <AppText tone="muted">
              Your recent sign-in confirms this request. If it has expired, sign in again and return here.
            </AppText>
          )}

          <Button
            label="Permanently delete account"
            variant="danger"
            loading={isDeleting}
            disabled={!canDelete}
            onPress={() => void deleteAccount()}
          />
        </Card>
      ) : null}
    </Screen>
  );
}

function getDeleteAccountErrorMessage(error: DeleteAccountError) {
  if (error.code === 'INVALID_PASSWORD') return 'The current password is incorrect.';
  if (error.code === 'SESSION_EXPIRED') return 'Sign out, sign in again, and retry this request.';
  if (error.status === 429) return 'Too many attempts. Please wait and try again.';
  return 'We could not delete your account. Please try again.';
}
