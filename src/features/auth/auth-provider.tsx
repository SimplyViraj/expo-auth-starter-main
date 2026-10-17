import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

import { getAuthPhase } from '@/features/auth/auth-phase';
import type { AuthPhase, User } from '@/features/auth/types';
import { authClient } from '@/lib/auth/auth-client';
import { appToast } from '@/lib/toast/app-toast';

type AuthContextValue = {
  phase: AuthPhase;
  user: User | null;
  isInitialSessionUnavailable: boolean;
  isRefreshingSession: boolean;
  isSigningOut: boolean;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const sessionQuery = authClient.useSession();
  const [hasCompletedInitialCheck, setHasCompletedInitialCheck] = useState(Boolean(sessionQuery.data));
  const [isSigningOut, setIsSigningOut] = useState(false);
  const hasShownRefreshError = useRef(false);

  if (!hasCompletedInitialCheck && !sessionQuery.isPending && !sessionQuery.error) {
    setHasCompletedInitialCheck(true);
  }

  useEffect(() => {
    if (hasCompletedInitialCheck && !sessionQuery.isPending && !sessionQuery.data?.user) {
      queryClient.removeQueries({ queryKey: ['protected'] });
    }
  }, [hasCompletedInitialCheck, queryClient, sessionQuery.data?.user, sessionQuery.isPending]);

  useEffect(() => {
    if (hasCompletedInitialCheck && sessionQuery.error && !hasShownRefreshError.current) {
      hasShownRefreshError.current = true;
      appToast.error('Couldn’t refresh your account', {
        description: 'Check your connection and try again.',
      });
    } else if (!sessionQuery.error) {
      hasShownRefreshError.current = false;
    }
  }, [hasCompletedInitialCheck, sessionQuery.error]);

  async function refreshSession() {
    await sessionQuery.refetch();
  }

  async function signOut() {
    setIsSigningOut(true);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        appToast.error('Couldn’t sign out', {
          description: 'Please try again.',
        });
        return;
      }

      queryClient.clear();
      await sessionQuery.refetch();
    } catch {
      appToast.error('Couldn’t sign out', {
        description: 'Check your connection and try again.',
      });
    } finally {
      setIsSigningOut(false);
    }
  }

  const data = sessionQuery.data;
  const user = data?.user ?? null;
  const isInitialSessionUnavailable =
    !hasCompletedInitialCheck && !sessionQuery.isPending && Boolean(sessionQuery.error) && !data;
  const phase = getAuthPhase(hasCompletedInitialCheck || Boolean(data), user);

  const value: AuthContextValue = {
    phase,
    user,
    isInitialSessionUnavailable,
    isRefreshingSession: sessionQuery.isRefetching,
    isSigningOut,
    refreshSession,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return value;
}
